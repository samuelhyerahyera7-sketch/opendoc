import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import pool from '../db.mjs'
import {
  verifyPassword,
  createAdminSession,
  revokeAdminSession,
  requireAdmin,
  logAudit,
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
} from '../adminAuth.mjs'
import crypto from 'node:crypto'
import { hashPassword as hashAdminPassword } from '../adminAuth.mjs'
import { adminLoginSchema, adminPasswordSchema, emailSchema, validateBody } from '../validation.mjs'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
})

// One-time bootstrap for the very first admin account, for deployments
// where nobody can run `npm run create-admin` directly against the
// production database (e.g. no network path to it from wherever the app is
// managed). Self-disabling: it only ever succeeds while admin_users is
// completely empty, and requires ADMIN_BOOTSTRAP_SECRET to be set — so it
// can never be used to add a second admin or replay against a live system,
// and does nothing at all unless that env var is explicitly configured.
router.post('/admin/bootstrap', loginLimiter, async (req, res) => {
  if (!process.env.ADMIN_BOOTSTRAP_SECRET) {
    return res.status(503).json({ error: 'Bootstrap is not enabled on this deployment' })
  }
  const { secret, email, password } = req.body || {}
  if (secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    return res.status(401).json({ error: 'Invalid bootstrap secret' })
  }
  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM admin_users')
  if (countRows[0].count > 0) {
    return res.status(409).json({ error: 'An admin account already exists — bootstrap is disabled' })
  }

  const emailCheck = emailSchema.safeParse(email)
  const passwordCheck = adminPasswordSchema.safeParse(password)
  if (!emailCheck.success) return res.status(400).json({ error: emailCheck.error.issues[0]?.message || 'Invalid email' })
  if (!passwordCheck.success) return res.status(400).json({ error: passwordCheck.error.issues[0]?.message || 'Invalid password' })

  const id = crypto.randomUUID()
  await pool.query('INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)', [
    id,
    emailCheck.data,
    hashAdminPassword(passwordCheck.data),
    'super_admin',
  ])
  res.status(201).json({ id, email: emailCheck.data, role: 'super_admin' })
})

router.post('/admin/login', loginLimiter, validateBody(adminLoginSchema), async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email])
  const admin = rows[0]
  if (!admin || !admin.active || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const token = await createAdminSession(admin.id, req)
  await pool.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [admin.id])
  res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOptions())
  res.json({ id: admin.id, email: admin.email, role: admin.role })
})

router.post('/admin/logout', requireAdmin, async (req, res) => {
  const token = req.cookies?.[ADMIN_COOKIE_NAME]
  await revokeAdminSession(token)
  await logAudit(req, 'ADMIN_LOGOUT', {})
  res.clearCookie(ADMIN_COOKIE_NAME, adminCookieOptions())
  res.json({ ok: true })
})

router.get('/admin/me', requireAdmin, (req, res) => {
  res.json(req.admin)
})

// Self-service email/password change. Requires an active admin session
// (requireAdmin) AND the current password — never a bare secret — so it
// can only ever be used by whoever already controls the account, exactly
// like the doctor/patient equivalents.
router.post('/admin/me/credentials', requireAdmin, loginLimiter, async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body || {}
  const { rows } = await pool.query('SELECT * FROM admin_users WHERE id = $1', [req.admin.id])
  const admin = rows[0]
  if (!admin || !verifyPassword(currentPassword || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const email = newEmail ? emailSchema.safeParse(newEmail) : null
  if (email && !email.success) return res.status(400).json({ error: email.error.issues[0]?.message || 'Invalid email' })

  let passwordHash = admin.password_hash
  if (newPassword) {
    const passwordCheck = adminPasswordSchema.safeParse(newPassword)
    if (!passwordCheck.success) return res.status(400).json({ error: passwordCheck.error.issues[0]?.message || 'Invalid password' })
    passwordHash = hashAdminPassword(passwordCheck.data)
  }

  await pool.query('UPDATE admin_users SET email = COALESCE($1, email), password_hash = $2, updated_at = now() WHERE id = $3', [
    email ? email.data : null,
    passwordHash,
    admin.id,
  ])
  // Cut every other session on this account — the one making this request
  // gets a fresh one below, same pattern as doctor/patient password changes.
  await pool.query('DELETE FROM admin_sessions WHERE admin_id = $1', [admin.id])
  const token = await createAdminSession(admin.id, req)
  res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOptions())
  await logAudit(req, 'ADMIN_CREDENTIALS_CHANGED', {})
  res.json({ id: admin.id, email: email ? email.data : admin.email, role: admin.role })
})

export default router
