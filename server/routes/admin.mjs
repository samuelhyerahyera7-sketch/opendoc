import { Router } from 'express'
import pool from '../db.mjs'
import { requireAdmin, requireRole, logAudit } from '../adminAuth.mjs'
import { revokeAllDoctorSessions } from '../auth.mjs'
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
// Restricted to super_admin — suspend (below) is almost always the right
// tool for a verification/support admin instead of permanent deletion.
router.delete('/admin/doctors/:id', requireAdmin, requireRole('super_admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM doctors WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  await pool.query('DELETE FROM doctors WHERE id = $1', [req.params.id])
  await logAudit(req, 'PROVIDER_DELETED', { resourceType: 'doctor', resourceId: req.params.id, metadata: { name: rows[0].name, email: rows[0].email } })
  res.status(204).end()
})

// Lets an admin correct a doctor's stored address/coordinates (e.g. when a
// signup was geocoded to a city/suburb centroid instead of the exact street).
router.patch('/admin/doctors/:id/location', requireAdmin, requireRole('super_admin', 'verification_admin'), async (req, res) => {
  const { address, city, lat, lng } = req.body
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' })
  }
  const { rows } = await pool.query(
    'UPDATE doctors SET address = COALESCE($1, address), city = COALESCE($2, city), lat = $3, lng = $4 WHERE id = $5 RETURNING *',
    [address ?? null, city ?? null, lat, lng, req.params.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  await logAudit(req, 'PROVIDER_LOCATION_EDITED', { resourceType: 'doctor', resourceId: req.params.id, metadata: { address, city, lat, lng } })
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

router.post('/admin/doctors/:id/verify', requireAdmin, requireRole('super_admin', 'verification_admin'), async (req, res) => {
  const { notes } = req.body || {}
  const { rows } = await pool.query(
    `UPDATE doctors
     SET verification_status = 'verified', verified_at = now(), verified_by = $2,
         verification_notes = $3, rejection_reason = NULL, last_verification_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, req.admin.id, notes || null],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  await notify(
    rows[0].id,
    'verification_approved',
    'Your HPCSA number has been verified',
    'Your profile is now marked as verified and visible to patients.',
    '/provider/dashboard',
  )
  await logAudit(req, 'PROVIDER_VERIFIED', { resourceType: 'doctor', resourceId: req.params.id, metadata: { notes: notes || null } })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

router.post('/admin/doctors/:id/reject', requireAdmin, requireRole('super_admin', 'verification_admin'), async (req, res) => {
  const { reason } = req.body || {}
  const { rows } = await pool.query(
    `UPDATE doctors
     SET verification_status = 'rejected', rejection_reason = $2,
         verified_by = $3, last_verification_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, reason || null, req.admin.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  // A rejected doctor's live sessions are cut immediately — no publicly
  // bookable profile should stay reachable from a session issued while the
  // profile was still pending.
  await revokeAllDoctorSessions(rows[0].id)
  await notify(
    rows[0].id,
    'verification_rejected',
    'Your verification was declined',
    'We could not verify your HPCSA number. Please check your details and contact support.',
    '/provider/dashboard',
  )
  await logAudit(req, 'PROVIDER_REJECTED', { resourceType: 'doctor', resourceId: req.params.id, metadata: { reason: reason || null } })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

// Suspension is the preferred alternative to deletion: it immediately takes
// a doctor out of public search/booking (same enforcement as "rejected")
// without destroying their history, appointments, files, or reviews.
router.post('/admin/doctors/:id/suspend', requireAdmin, requireRole('super_admin', 'verification_admin'), async (req, res) => {
  const { reason } = req.body || {}
  const { rows } = await pool.query(
    `UPDATE doctors SET verification_status = 'suspended', rejection_reason = $2, verified_by = $3, last_verification_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, reason || null, req.admin.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  await revokeAllDoctorSessions(rows[0].id)
  await logAudit(req, 'PROVIDER_SUSPENDED', { resourceType: 'doctor', resourceId: req.params.id, metadata: { reason: reason || null } })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

router.post('/admin/doctors/:id/reactivate', requireAdmin, requireRole('super_admin', 'verification_admin'), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE doctors SET verification_status = 'verified', verified_at = now(), verified_by = $2, rejection_reason = NULL, last_verification_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, req.admin.id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  await logAudit(req, 'PROVIDER_REACTIVATED', { resourceType: 'doctor', resourceId: req.params.id })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

router.get('/admin/audit-log', requireAdmin, requireRole('super_admin'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500)
  const { rows } = await pool.query('SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT $1', [limit])
  res.json(rows)
})

export default router
