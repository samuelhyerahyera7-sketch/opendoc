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
  req.doctorToken = token
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
  req.patientToken = token
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
// Non-blocking lookup: returns the doctor id for a bearer token if present
// and valid, or null — never rejects the request. Used where a route is
// public but should behave slightly differently for an authenticated owner
// (e.g. a pending doctor previewing their own not-yet-public profile).
export async function optionalDoctorId(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  return getDoctorIdForToken(token)
}

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

// Admin auth (real accounts, RBAC, audit log) lives in server/adminAuth.mjs —
// the old single-shared-ADMIN_TOKEN gate that used to live here is gone.

// Invalidates every existing session for a doctor except (optionally) the
// one just used to make the request — used on password change/reset so a
// stolen old session can't keep riding along after the owner secures the
// account.
export async function revokeAllDoctorSessions(doctorId, exceptToken = null) {
  if (exceptToken) {
    await pool.query('DELETE FROM sessions WHERE doctor_id = $1 AND token != $2', [doctorId, exceptToken])
  } else {
    await pool.query('DELETE FROM sessions WHERE doctor_id = $1', [doctorId])
  }
}

export async function revokeAllPatientSessions(patientId, exceptToken = null) {
  if (exceptToken) {
    await pool.query('DELETE FROM patient_sessions WHERE patient_id = $1 AND token != $2', [patientId, exceptToken])
  } else {
    await pool.query('DELETE FROM patient_sessions WHERE patient_id = $1', [patientId])
  }
}
