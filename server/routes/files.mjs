import { Router } from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import db from '../db.mjs'
import { requireAuth } from '../auth.mjs'
import { uploadsDir } from '../db.mjs'

const router = Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10)
    cb(null, `${crypto.randomUUID()}${safeExt}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

function canAccessFile(doctorId, file) {
  if (file.uploading_doctor_id === doctorId) return true
  const transfer = db
    .prepare('SELECT 1 FROM file_transfers WHERE file_id = ? AND to_doctor_id = ?')
    .get(file.id, doctorId)
  return !!transfer
}

// Files uploaded by the current doctor
router.get('/doctors/me/files', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM patient_files WHERE uploading_doctor_id = ? ORDER BY created_at DESC')
    .all(req.doctorId)
  res.json(rows)
})

// Files transferred to the current doctor
router.get('/doctors/me/files/received', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ft.id as transfer_id, ft.message, ft.status, ft.created_at as transferred_at,
              d.name as from_doctor_name, d.specialty as from_doctor_specialty,
              pf.*
       FROM file_transfers ft
       JOIN patient_files pf ON pf.id = ft.file_id
       JOIN doctors d ON d.id = ft.from_doctor_id
       WHERE ft.to_doctor_id = ?
       ORDER BY ft.created_at DESC`,
    )
    .all(req.doctorId)
  res.json(rows)
})

router.post('/doctors/me/files', requireAuth, upload.single('file'), (req, res) => {
  const { patientFirstName, patientLastName, patientEmail, note } = req.body
  if (!req.file) return res.status(400).json({ error: 'A file is required' })
  if (!patientFirstName || !patientLastName) {
    fs.unlink(req.file.path, () => {})
    return res.status(400).json({ error: 'Patient first and last name are required' })
  }

  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO patient_files
      (id, uploading_doctor_id, patient_first_name, patient_last_name, patient_email, original_name, stored_name, mime_type, size_bytes, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.doctorId, patientFirstName, patientLastName, patientEmail || '', req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, note || '')

  const row = db.prepare('SELECT * FROM patient_files WHERE id = ?').get(id)
  res.status(201).json(row)
})

router.post('/files/:id/transfer', requireAuth, (req, res) => {
  const { toDoctorId, message } = req.body
  const file = db.prepare('SELECT * FROM patient_files WHERE id = ?').get(req.params.id)
  if (!file) return res.status(404).json({ error: 'File not found' })
  if (!canAccessFile(req.doctorId, file)) return res.status(403).json({ error: 'You do not have access to this file' })

  const toDoctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(toDoctorId)
  if (!toDoctor) return res.status(404).json({ error: 'Recipient doctor not found' })
  if (toDoctor.id === req.doctorId) return res.status(400).json({ error: 'Cannot transfer a file to yourself' })

  const id = crypto.randomUUID()
  db.prepare('INSERT INTO file_transfers (id, file_id, from_doctor_id, to_doctor_id, message) VALUES (?, ?, ?, ?, ?)').run(
    id,
    file.id,
    req.doctorId,
    toDoctor.id,
    message || '',
  )

  const row = db.prepare('SELECT * FROM file_transfers WHERE id = ?').get(id)
  res.status(201).json(row)
})

router.get('/files/:id/download', requireAuth, (req, res) => {
  const file = db.prepare('SELECT * FROM patient_files WHERE id = ?').get(req.params.id)
  if (!file) return res.status(404).json({ error: 'File not found' })
  if (!canAccessFile(req.doctorId, file)) return res.status(403).json({ error: 'You do not have access to this file' })

  const filePath = path.join(uploadsDir, file.stored_name)
  res.download(filePath, file.original_name)
})

export default router
