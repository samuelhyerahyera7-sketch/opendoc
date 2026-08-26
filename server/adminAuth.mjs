import crypto from 'node:crypto'
import pool from './db.mjs'
import { hashPassword, verifyPassword } from './auth.mjs'

export { hashPassword, verifyPassword }

const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours — shorter than doctor/patient sessions on purpose
export const ADMIN_COOKIE_NAME = 'opendoc_admin_session'

export const ADMIN_ROLES = ['super_admin', 'verification_admin', 'support_admin']

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  }
}

export async function createAdminSession(adminId, req) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await pool.query(
    'INSERT INTO admin_sessions (token, admin_id, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [token, adminId, expiresAt, req?.ip || null, req?.headers?.['user-agent'] || null],
  )
  return token
}

export async function getAdminForToken(token) {
  if (!token) return null
  const { rows } = await pool.query(
    `SELECT a.id, a.email, a.role, a.active, s.expires_at
     FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token = $1`,
    [token],
  )
  const row = rows[0]
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM admin_sessions WHERE token = $1', [token])
    return null
  }
  if (!row.active) return null
  return { id: row.id, email: row.email, role: row.role }
}

export async function revokeAdminSession(token) {
  if (!token) return
  await pool.query('DELETE FROM admin_sessions WHERE token = $1', [token])
}

// Reads the session cookie, attaches req.admin = { id, email, role } on
// success. Every admin route needs this; requireRole() further restricts by
// role on top of it.
export async function requireAdmin(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE_NAME]
  const admin = await getAdminForToken(token)
  if (!admin) return res.status(401).json({ error: 'Not authenticated' })
  req.admin = admin
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Not authenticated' })
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Your admin role does not permit this action' })
    }
    next()
  }
}

// Records an admin action for the audit trail. Never throws into the
// caller's request handling — a logging failure shouldn't block the action
// itself, but it is surfaced to the server logs so it isn't silently lost.
export async function logAudit(req, action, { resourceType = null, resourceId = null, metadata = null } = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_email, action, resource_type, resource_id, ip, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        req.admin?.id || null,
        req.admin?.email || null,
        action,
        resourceType,
        resourceId,
        req.ip || null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    )
  } catch (err) {
    console.error('[audit] failed to record', action, err)
  }
}
