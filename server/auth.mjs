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
