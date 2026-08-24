import { Router } from 'express'
import pool from '../db.mjs'
import { requireAuth } from '../auth.mjs'

const router = Router()

router.get('/doctors/me/notifications', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE doctor_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.doctorId],
  )
  res.json(rows)
})

router.get('/doctors/me/notifications/unread-count', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int as count FROM notifications WHERE doctor_id = $1 AND read_at IS NULL',
    [req.doctorId],
  )
  res.json({ count: rows[0].count })
})

router.post('/doctors/me/notifications/:id/read', requireAuth, async (req, res) => {
  const result = await pool.query(
    'UPDATE notifications SET read_at = now() WHERE id = $1 AND doctor_id = $2 AND read_at IS NULL',
    [req.params.id, req.doctorId],
  )
  if (result.rowCount === 0) return res.status(404).json({ error: 'Notification not found' })
  res.status(204).end()
})

router.post('/doctors/me/notifications/read-all', requireAuth, async (req, res) => {
  await pool.query('UPDATE notifications SET read_at = now() WHERE doctor_id = $1 AND read_at IS NULL', [req.doctorId])
  res.status(204).end()
})

export default router
