import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import {
  hashPassword,
  verifyPassword,
  createPatientSession,
  requirePatientAuth,
  createPatientActionToken,
  consumePatientActionToken,
} from '../auth.mjs'
import { sendEmail, verifyEmailMessage, resetPasswordEmail } from '../email.mjs'

const router = Router()

const appUrl = () => process.env.APP_URL || 'http://localhost:5173'

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
    emailVerified: !!row.email_verified,
  }
}

router.post('/patients/register', authLimiter, async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'First name, last name, email, and password are required' })
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const normalizedEmail = String(email).toLowerCase()
  const { rows: existing } = await pool.query('SELECT 1 FROM patients WHERE email = $1', [normalizedEmail])
  if (existing[0]) return res.status(409).json({ error: 'An account with this email already exists' })

  const id = crypto.randomUUID()
  await pool.query(
    'INSERT INTO patients (id, first_name, last_name, email, password_hash, phone) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, firstName, lastName, normalizedEmail, hashPassword(password), phone || ''],
  )

  const verifyToken = await createPatientActionToken(id, 'verify_email')
  const { subject, html } = verifyEmailMessage({ name: firstName, verifyUrl: `${appUrl()}/patient/verify-email?token=${verifyToken}` })
  await sendEmail({ to: normalizedEmail, subject, html })

  const token = await createPatientSession(id)
  const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [id])
  res.status(201).json({ token, patient: serializePatient(rows[0]) })
})

router.post('/patients/login', authLimiter, async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query('SELECT * FROM patients WHERE email = $1', [String(email || '').toLowerCase()])
  const patient = rows[0]
  if (!patient || !verifyPassword(password || '', patient.password_hash)) {
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

router.get('/patients/verify-email', async (req, res) => {
  const patientId = await consumePatientActionToken(String(req.query.token || ''), 'verify_email')
  if (!patientId) return res.status(400).json({ error: 'This verification link is invalid or has expired.' })
  await pool.query('UPDATE patients SET email_verified = TRUE WHERE id = $1', [patientId])
  res.json({ ok: true })
})

router.post('/patients/resend-verification', requirePatientAuth, authLimiter, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [req.patientId])
  const patient = rows[0]
  if (!patient) return res.status(404).json({ error: 'Not found' })
  if (patient.email_verified) return res.json({ ok: true, alreadyVerified: true })

  const verifyToken = await createPatientActionToken(patient.id, 'verify_email')
  const { subject, html } = verifyEmailMessage({ name: patient.first_name, verifyUrl: `${appUrl()}/patient/verify-email?token=${verifyToken}` })
  const result = await sendEmail({ to: patient.email, subject, html })
  res.json({ ok: true, emailSent: result.sent })
})

router.post('/patients/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body
  const { rows } = await pool.query('SELECT * FROM patients WHERE email = $1', [String(email || '').toLowerCase()])
  const patient = rows[0]

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to check which emails have patient accounts.
  if (patient) {
    const resetToken = await createPatientActionToken(patient.id, 'reset_password')
    const { subject, html } = resetPasswordEmail({ name: patient.first_name, resetUrl: `${appUrl()}/patient/reset-password?token=${resetToken}` })
    await sendEmail({ to: patient.email, subject, html })
  }
  res.json({ ok: true })
})

router.post('/patients/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const patientId = await consumePatientActionToken(String(token || ''), 'reset_password')
  if (!patientId) return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
  await pool.query('UPDATE patients SET password_hash = $1 WHERE id = $2', [hashPassword(password), patientId])
  res.json({ ok: true })
})

export default router
