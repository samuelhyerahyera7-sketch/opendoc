import crypto from 'node:crypto'
import pool from './db.mjs'

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const check = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'))
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export async function createSession(doctorId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await pool.query('INSERT INTO sessions (token, doctor_id, expires_at) VALUES ($1, $2, $3)', [token, doctorId, expiresAt])
  return token
}

export async function getDoctorIdForToken(token) {
  if (!token) return null
  const { rows } = await pool.query('SELECT doctor_id, expires_at FROM sessions WHERE token = $1', [token])
  const row = rows[0]
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token])
    return null
  }
  return row.doctor_id
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const doctorId = await getDoctorIdForToken(token)
  if (!doctorId) return res.status(401).json({ error: 'Not authenticated' })
  req.doctorId = doctorId
  next()
}

export async function createPatientSession(patientId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await pool.query('INSERT INTO patient_sessions (token, patient_id, expires_at) VALUES ($1, $2, $3)', [token, patientId, expiresAt])
  return token
}

export async function getPatientIdForToken(token) {
  if (!token) return null
  const { rows } = await pool.query('SELECT patient_id, expires_at FROM patient_sessions WHERE token = $1', [token])
  const row = rows[0]
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM patient_sessions WHERE token = $1', [token])
    return null
  }
  return row.patient_id
}

export async function requirePatientAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const patientId = await getPatientIdForToken(token)
  if (!patientId) return res.status(401).json({ error: 'Not authenticated' })
  req.patientId = patientId
  next()
}

// Optional variant for the booking endpoint: attaches req.patientId when a
// valid patient session is present, but never blocks the request — guest
// booking (no account) stays fully supported.
export async function optionalPatientAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  req.patientId = await getPatientIdForToken(token)
  next()
}

export async function createPatientActionToken(patientId, purpose) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ACTION_TOKEN_TTL_MS[purpose])
  await pool.query('INSERT INTO patient_action_tokens (token, patient_id, purpose, expires_at) VALUES ($1, $2, $3, $4)', [token, patientId, purpose, expiresAt])
  return token
}

export async function consumePatientActionToken(token, purpose) {
  const { rows } = await pool.query(
    'SELECT patient_id, expires_at, used_at FROM patient_action_tokens WHERE token = $1 AND purpose = $2',
    [token, purpose],
  )
  const row = rows[0]
  if (!row) return null
  if (row.used_at) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  await pool.query('UPDATE patient_action_tokens SET used_at = now() WHERE token = $1', [token])
  return row.patient_id
}

// Cancel/reschedule can be initiated by either the doctor or the patient on
// an appointment, so this tries both token types against the same bearer
// token and attaches whichever one resolves (never both — the two session
// tables are independent, so a token only ever matches one).
export async function requireDoctorOrPatientAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const doctorId = await getDoctorIdForToken(token)
  if (doctorId) {
    req.doctorId = doctorId
    return next()
  }
  const patientId = await getPatientIdForToken(token)
  if (patientId) {
    req.patientId = patientId
    return next()
  }
  return res.status(401).json({ error: 'Not authenticated' })
}

const ACTION_TOKEN_TTL_MS = {
  verify_email: 1000 * 60 * 60 * 24, // 24 hours
  reset_password: 1000 * 60 * 60, // 1 hour
}

export async function createActionToken(doctorId, purpose) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ACTION_TOKEN_TTL_MS[purpose])
  await pool.query('INSERT INTO action_tokens (token, doctor_id, purpose, expires_at) VALUES ($1, $2, $3, $4)', [token, doctorId, purpose, expiresAt])
  return token
}

// Single-use: marks the token used_at in the same call so it can't be replayed.
export async function consumeActionToken(token, purpose) {
  const { rows } = await pool.query(
    'SELECT doctor_id, expires_at, used_at FROM action_tokens WHERE token = $1 AND purpose = $2',
    [token, purpose],
  )
  const row = rows[0]
  if (!row) return null
  if (row.used_at) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  await pool.query('UPDATE action_tokens SET used_at = now() WHERE token = $1', [token])
  return row.doctor_id
}

// Simple single-operator admin gate: one shared token from the ADMIN_TOKEN
// env var, no separate admin account system. Good enough for a small team
// reviewing doctor verification requests; swap for real admin accounts if
// more than one person needs access with an audit trail.
export function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_TOKEN) {
    return res.status(503).json({ error: 'Admin access is not configured on this deployment' })
  }
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Not authorized' })
  }
  next()
}
