import { Router } from 'express'
import pool from '../db.mjs'
import { requireAdmin } from '../auth.mjs'
import { serializeDoctor } from '../serialize.mjs'

const router = Router()

router.get('/admin/doctors/pending', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM doctors WHERE verification_status = 'pending' ORDER BY created_at ASC",
  )
  res.json(await Promise.all(rows.map((r) => serializeDoctor(r, { includePrivate: true }))))
})

router.post('/admin/doctors/:id/verify', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE doctors SET verification_status = 'verified' WHERE id = $1 RETURNING *",
    [req.params.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

router.post('/admin/doctors/:id/reject', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE doctors SET verification_status = 'rejected' WHERE id = $1 RETURNING *",
    [req.params.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

export default router
