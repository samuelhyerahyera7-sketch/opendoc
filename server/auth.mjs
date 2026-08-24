import crypto from 'node:crypto'
import db from './db.mjs'

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

export function createSession(doctorId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.prepare('INSERT INTO sessions (token, doctor_id, expires_at) VALUES (?, ?, ?)').run(token, doctorId, expiresAt)
  return token
}

export function getDoctorIdForToken(token) {
  if (!token) return null
  const row = db.prepare('SELECT doctor_id, expires_at FROM sessions WHERE token = ?').get(token)
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  return row.doctor_id
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const doctorId = getDoctorIdForToken(token)
  if (!doctorId) return res.status(401).json({ error: 'Not authenticated' })
  req.doctorId = doctorId
  next()
}
