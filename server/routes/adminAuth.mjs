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
import { adminLoginSchema, validateBody } from '../validation.mjs'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
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

export default router
