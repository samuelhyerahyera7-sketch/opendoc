import { Router } from 'express'
import pool from '../db.mjs'
import { requireAdmin } from '../auth.mjs'
import { serializeDoctor } from '../serialize.mjs'
import { notify } from '../notifications.mjs'

const router = Router()

router.get('/admin/doctors/pending', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM doctors WHERE verification_status = 'pending' ORDER BY created_at ASC",
  )
  res.json(await Promise.all(rows.map((r) => serializeDoctor(r, { includePrivate: true }))))
})

// Full directory, for admin cleanup/management rather than just the
// verification queue.
router.get('/admin/doctors', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM doctors ORDER BY created_at DESC')
  res.json(await Promise.all(rows.map((r) => serializeDoctor(r, { includePrivate: true }))))
})

// Permanently removes a doctor and everything tied to them (insurances,
// slots, appointments, reviews, files, transfers) via ON DELETE CASCADE.
router.delete('/admin/doctors/:id', requireAdmin, async (req, res) => {
  const result = await pool.query('DELETE FROM doctors WHERE id = $1', [req.params.id])
  if (result.rowCount === 0) return res.status(404).json({ error: 'Doctor not found' })
  res.status(204).end()
})

router.post('/admin/doctors/:id/verify', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE doctors SET verification_status = 'verified' WHERE id = $1 RETURNING *",
    [req.params.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  await notify(
    rows[0].id,
    'verification_approved',
    'Your HPCSA number has been verified',
    'Your profile is now marked as verified and visible to patients.',
    '/provider/dashboard',
  )
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

router.post('/admin/doctors/:id/reject', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE doctors SET verification_status = 'rejected' WHERE id = $1 RETURNING *",
    [req.params.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  await notify(
    rows[0].id,
    'verification_rejected',
    'Your verification was declined',
    'We could not verify your HPCSA number. Please check your details and contact support.',
    '/provider/dashboard',
  )
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

export default router
