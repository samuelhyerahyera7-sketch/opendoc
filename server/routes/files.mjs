import { Router } from 'express'
import crypto from 'node:crypto'
import multer from 'multer'
import pool from '../db.mjs'
import { requireAuth } from '../auth.mjs'
import { uploadFile, readFile } from '../storage.mjs'
import { notify } from '../notifications.mjs'

const router = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

async function canAccessFile(doctorId, file) {
  if (file.uploading_doctor_id === doctorId) return true
  const { rows } = await pool.query('SELECT 1 FROM file_transfers WHERE file_id = $1 AND to_doctor_id = $2', [file.id, doctorId])
  return rows.length > 0
}

// Files uploaded by the current doctor
router.get('/doctors/me/files', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM patient_files WHERE uploading_doctor_id = $1 ORDER BY created_at DESC', [req.doctorId])
  res.json(rows)
})

// Files transferred to the current doctor
router.get('/doctors/me/files/received', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ft.id as transfer_id, ft.message, ft.status, ft.created_at as transferred_at,
            d.name as from_doctor_name, d.specialty as from_doctor_specialty,
            pf.*
     FROM file_transfers ft
     JOIN patient_files pf ON pf.id = ft.file_id
     JOIN doctors d ON d.id = ft.from_doctor_id
     WHERE ft.to_doctor_id = $1
     ORDER BY ft.created_at DESC`,
    [req.doctorId],
  )
  res.json(rows)
})

router.post('/doctors/me/files', requireAuth, upload.single('file'), async (req, res) => {
  const { patientFirstName, patientLastName, patientEmail, note } = req.body
  if (!req.file) return res.status(400).json({ error: 'A file is required' })
  if (!patientFirstName || !patientLastName) {
    return res.status(400).json({ error: 'Patient first and last name are required' })
  }

  const stored = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)

  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO patient_files
      (id, uploading_doctor_id, patient_first_name, patient_last_name, patient_email, original_name, storage_url, storage_path, mime_type, size_bytes, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, req.doctorId, patientFirstName, patientLastName, patientEmail || '', req.file.originalname, stored.url, stored.path, req.file.mimetype, req.file.size, note || ''],
  )

  const { rows } = await pool.query('SELECT * FROM patient_files WHERE id = $1', [id])
  res.status(201).json(rows[0])
})

router.post('/files/:id/transfer', requireAuth, async (req, res) => {
  const { toDoctorId, message } = req.body
  const { rows: fileRows } = await pool.query('SELECT * FROM patient_files WHERE id = $1', [req.params.id])
  const file = fileRows[0]
  if (!file) return res.status(404).json({ error: 'File not found' })
  if (!(await canAccessFile(req.doctorId, file))) return res.status(403).json({ error: 'You do not have access to this file' })

  const { rows: toDoctorRows } = await pool.query('SELECT id FROM doctors WHERE id = $1', [toDoctorId])
  const toDoctor = toDoctorRows[0]
  if (!toDoctor) return res.status(404).json({ error: 'Recipient doctor not found' })
  if (toDoctor.id === req.doctorId) return res.status(400).json({ error: 'Cannot transfer a file to yourself' })

  const { rows: fromDoctorRows } = await pool.query('SELECT name FROM doctors WHERE id = $1', [req.doctorId])
  const fromDoctorName = fromDoctorRows[0]?.name || 'A colleague'

  const id = crypto.randomUUID()
  await pool.query(
    'INSERT INTO file_transfers (id, file_id, from_doctor_id, to_doctor_id, message) VALUES ($1, $2, $3, $4, $5)',
    [id, file.id, req.doctorId, toDoctor.id, message || ''],
  )

  await notify(
    toDoctor.id,
    'file_received',
    `${fromDoctorName} sent you a patient file`,
    `${file.patient_first_name} ${file.patient_last_name}${message ? ` — ${message}` : ''}`,
    '/provider/dashboard',
  )

  const { rows } = await pool.query('SELECT * FROM file_transfers WHERE id = $1', [id])
  res.status(201).json(rows[0])
})

router.get('/files/:id/download', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM patient_files WHERE id = $1', [req.params.id])
  const file = rows[0]
  if (!file) return res.status(404).json({ error: 'File not found' })
  if (!(await canAccessFile(req.doctorId, file))) return res.status(403).json({ error: 'You do not have access to this file' })

  const buffer = await readFile(file.storage_url, file.storage_path)
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`)
  res.send(buffer)
})

export default router
