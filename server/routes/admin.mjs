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

// Lets an admin correct a doctor's stored address/coordinates (e.g. when a
// signup was geocoded to a city/suburb centroid instead of the exact street).
router.patch('/admin/doctors/:id/location', requireAdmin, async (req, res) => {
  const { address, city, lat, lng } = req.body
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' })
  }
  const { rows } = await pool.query(
    'UPDATE doctors SET address = COALESCE($1, address), city = COALESCE($2, city), lat = $3, lng = $4 WHERE id = $5 RETURNING *',
    [address ?? null, city ?? null, lat, lng, req.params.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

// Lets an admin open a slot on a doctor's behalf for support purposes (e.g.
// helping a doctor populate their calendar without needing their password).
// Mirrors the idempotent behavior of the doctor's own POST /doctors/me/slots.
router.post('/admin/doctors/:id/slots', requireAdmin, async (req, res) => {
  const { day, time, date } = req.body
  if (!day || !time) return res.status(400).json({ error: 'day and time are required' })
  if (date && Number.isNaN(Date.parse(date))) return res.status(400).json({ error: 'Invalid date' })

  const { rows: doctorRows } = await pool.query('SELECT id FROM doctors WHERE id = $1', [req.params.id])
  if (!doctorRows[0]) return res.status(404).json({ error: 'Doctor not found' })

  const { rows: existing } = await pool.query(
    'SELECT id FROM doctor_slots WHERE doctor_id = $1 AND day_label = $2 AND time_label = $3 AND is_booked = FALSE LIMIT 1',
    [req.params.id, day, time],
  )
  if (existing[0]) return res.status(200).json({ id: existing[0].id, day, time, date: date || null })

  const { rows } = await pool.query(
    'INSERT INTO doctor_slots (doctor_id, day_label, time_label, slot_date) VALUES ($1, $2, $3, $4) RETURNING id',
    [req.params.id, day, time, date || null],
  )
  res.status(201).json({ id: rows[0].id, day, time, date: date || null })
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
