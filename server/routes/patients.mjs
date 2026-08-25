import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import { hashPassword, verifyPassword, createPatientSession, requirePatientAuth } from '../auth.mjs'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
})

function serializePatient(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || '',
  }
}

router.post('/patients/register', authLimiter, async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'First name, last name, email, and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const { rows: existing } = await pool.query('SELECT 1 FROM patients WHERE email = $1', [email])
  if (existing[0]) return res.status(409).json({ error: 'An account with this email already exists' })

  const id = crypto.randomUUID()
  await pool.query(
    'INSERT INTO patients (id, first_name, last_name, email, password_hash, phone) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, firstName, lastName, email, hashPassword(password), phone || ''],
  )
  const token = await createPatientSession(id)
  const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [id])
  res.status(201).json({ token, patient: serializePatient(rows[0]) })
})

router.post('/patients/login', authLimiter, async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query('SELECT * FROM patients WHERE email = $1', [email])
  const patient = rows[0]
  if (!patient || !verifyPassword(password, patient.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' })
  }
  const token = await createPatientSession(patient.id)
  res.json({ token, patient: serializePatient(patient) })
})

router.get('/patients/me', requirePatientAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [req.patientId])
  if (!rows[0]) return res.status(404).json({ error: 'Patient not found' })
  res.json(serializePatient(rows[0]))
})

// A patient's appointment history — matched by their account rather than by
// re-typing name/email each time, for appointments they booked while logged in.
router.get('/patients/me/appointments', requirePatientAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, d.name as doctor_name, d.credentials as doctor_credentials, d.specialty as doctor_specialty,
            d.photo as doctor_photo, d.address as doctor_address
     FROM appointments a JOIN doctors d ON d.id = a.doctor_id
     WHERE a.patient_id = $1
     ORDER BY a.created_at DESC`,
    [req.patientId],
  )
  res.json(rows)
})

router.get('/patients/me/notifications', requirePatientAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM patient_notifications WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.patientId],
  )
  res.json(rows)
})

router.get('/patients/me/notifications/unread-count', requirePatientAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int as count FROM patient_notifications WHERE patient_id = $1 AND read_at IS NULL',
    [req.patientId],
  )
  res.json({ count: rows[0].count })
})

router.post('/patients/me/notifications/:id/read', requirePatientAuth, async (req, res) => {
  const result = await pool.query(
    'UPDATE patient_notifications SET read_at = now() WHERE id = $1 AND patient_id = $2 AND read_at IS NULL',
    [req.params.id, req.patientId],
  )
  if (result.rowCount === 0) return res.status(404).json({ error: 'Notification not found' })
  res.status(204).end()
})

router.post('/patients/me/notifications/read-all', requirePatientAuth, async (req, res) => {
  await pool.query('UPDATE patient_notifications SET read_at = now() WHERE patient_id = $1 AND read_at IS NULL', [req.patientId])
  res.status(204).end()
})

export default router
