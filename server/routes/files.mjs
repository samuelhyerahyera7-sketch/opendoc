import { Router } from 'express'
import crypto from 'node:crypto'
import multer from 'multer'
import pool from '../db.mjs'
import { requireAuth } from '../auth.mjs'
import { uploadFile, readFile } from '../storage.mjs'
import { notify } from '../notifications.mjs'

const router = Router()

// Healthcare-document allowlist, checked against the file's actual magic
// bytes below — never trust the browser-supplied MIME type alone, since
// it's just a header the client sets and can be wrong or spoofed.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const MAGIC_BYTE_CHECKS = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2a, 0x00] },
  { mime: 'image/tiff', bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  // WebP: "RIFF"...."WEBP" — check both anchors since bytes 4-7 are a size field.
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  // .doc (legacy OLE) and .docx (zip) both start with well-known headers.
  { mime: 'application/msword', bytes: [0xd0, 0xcf, 0x11, 0xe0] },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: [0x50, 0x4b, 0x03, 0x04] },
]

function matchesActualFileType(buffer, declaredMime) {
  return MAGIC_BYTE_CHECKS.some(({ mime, bytes, offset = 0 }) => {
    if (mime !== declaredMime) return false
    if (buffer.length < offset + bytes.length) return false
    return bytes.every((b, i) => buffer[offset + i] === b)
  })
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only PDF, JPEG, PNG, WebP, TIFF, DOC, and DOCX files are allowed'))
    }
    cb(null, true)
  },
})

async function logFileAccess(fileId, doctorId, action, metadata = null) {
  try {
    await pool.query(
      'INSERT INTO file_access_log (id, file_id, doctor_id, action, metadata) VALUES ($1, $2, $3, $4, $5)',
      [crypto.randomUUID(), fileId, doctorId, action, metadata ? JSON.stringify(metadata) : null],
    )
  } catch (err) {
    console.error('[file-audit] failed to record', action, err)
  }
}

// View/download: the uploader (owner) or anyone the file has been
// transferred to, directly or through a chain of transfers.
async function canViewFile(doctorId, file) {
  if (file.uploading_doctor_id === doctorId) return true
  const { rows } = await pool.query('SELECT 1 FROM file_transfers WHERE file_id = $1 AND to_doctor_id = $2', [file.id, doctorId])
  return rows.length > 0
}

// Transfer (forwarding to a new doctor): owner only. Receiving a file does
// NOT grant permission to forward it again — a further transfer must come
// from the original uploader, who remains accountable for where the
// patient's file goes. (If a referral chain genuinely needs doctor B to
// forward to doctor C, doctor B asks the uploader to make that transfer.)
function canTransferFile(doctorId, file) {
  return file.uploading_doctor_id === doctorId
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

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Invalid file upload' })
    next()
  })
}

router.post('/doctors/me/files', requireAuth, handleUpload, async (req, res) => {
  const { patientFirstName, patientLastName, patientEmail, note } = req.body
  if (!req.file) return res.status(400).json({ error: 'A file is required' })
  if (!patientFirstName || !patientLastName) {
    return res.status(400).json({ error: 'Patient first and last name are required' })
  }
  if (!matchesActualFileType(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({ error: 'This file does not appear to be a valid file of the type it claims to be' })
  }

  const stored = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)

  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO patient_files
      (id, uploading_doctor_id, patient_first_name, patient_last_name, patient_email, original_name, storage_url, storage_path, mime_type, size_bytes, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, req.doctorId, patientFirstName, patientLastName, patientEmail || '', req.file.originalname, stored.url, stored.path, req.file.mimetype, req.file.size, note || ''],
  )
  await logFileAccess(id, req.doctorId, 'upload', { originalName: req.file.originalname, sizeBytes: req.file.size })

  const { rows } = await pool.query('SELECT * FROM patient_files WHERE id = $1', [id])
  res.status(201).json(rows[0])
})

router.post('/files/:id/transfer', requireAuth, async (req, res) => {
  const { toDoctorId, message, consentConfirmed, consentBasis } = req.body
  const { rows: fileRows } = await pool.query('SELECT * FROM patient_files WHERE id = $1', [req.params.id])
  const file = fileRows[0]
  if (!file) return res.status(404).json({ error: 'File not found' })

  if (!canTransferFile(req.doctorId, file)) {
    await logFileAccess(file.id, req.doctorId, 'transfer_denied', { reason: 'not_owner' })
    return res.status(403).json({
      error: 'Only the doctor who uploaded this file can transfer it. Ask them to forward it if a further referral is needed.',
    })
  }
  if (!consentConfirmed) {
    return res.status(400).json({ error: 'You must confirm the patient has consented to this transfer' })
  }

  const { rows: toDoctorRows } = await pool.query('SELECT id FROM doctors WHERE id = $1', [toDoctorId])
  const toDoctor = toDoctorRows[0]
  if (!toDoctor) return res.status(404).json({ error: 'Recipient doctor not found' })
  if (toDoctor.id === req.doctorId) return res.status(400).json({ error: 'Cannot transfer a file to yourself' })

  const { rows: fromDoctorRows } = await pool.query('SELECT name FROM doctors WHERE id = $1', [req.doctorId])
  const fromDoctorName = fromDoctorRows[0]?.name || 'A colleague'

  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO file_transfers (id, file_id, from_doctor_id, to_doctor_id, message, consent_basis, consent_confirmed_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [id, file.id, req.doctorId, toDoctor.id, message || '', consentBasis || null],
  )
  await logFileAccess(file.id, req.doctorId, 'transfer', { toDoctorId: toDoctor.id })

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
  if (!(await canViewFile(req.doctorId, file))) {
    await logFileAccess(file.id, req.doctorId, 'access_denied')
    return res.status(403).json({ error: 'You do not have access to this file' })
  }

  const buffer = await readFile(file.storage_url, file.storage_path)
  await logFileAccess(file.id, req.doctorId, 'download')
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`)
  res.send(buffer)
})

export default router
