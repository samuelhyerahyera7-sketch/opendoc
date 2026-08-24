import { Router } from 'express'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import { requireAuth } from '../auth.mjs'
import { sendEmail, appointmentConfirmationEmail, newBookingAlertEmail } from '../email.mjs'

const router = Router()

router.post('/appointments', async (req, res) => {
  const { doctorId, slotId, firstName, lastName, email, phone, reason, newPatient } = req.body

  if (!doctorId || !slotId || !firstName || !lastName || !email || !phone) {
    return res.status(400).json({ error: 'Missing required booking fields' })
  }

  const { rows: slotRows } = await pool.query('SELECT * FROM doctor_slots WHERE id = $1 AND doctor_id = $2', [slotId, doctorId])
  const slot = slotRows[0]
  if (!slot) return res.status(404).json({ error: 'That time slot could not be found' })
  if (slot.is_booked) return res.status(409).json({ error: 'That time slot was just booked by someone else' })

  const { rows: doctorRows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [doctorId])
  const doctor = doctorRows[0]
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const id = crypto.randomUUID()
  const reviewToken = crypto.randomBytes(20).toString('hex')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const updateResult = await client.query(
      'UPDATE doctor_slots SET is_booked = TRUE WHERE id = $1 AND is_booked = FALSE',
      [slotId],
    )
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'That time slot was just booked by someone else' })
    }
    await client.query(
      `INSERT INTO appointments
        (id, doctor_id, slot_id, patient_first_name, patient_last_name, patient_email, patient_phone, reason, new_patient, day_label, time_label, review_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, doctorId, slotId, firstName, lastName, email, phone, reason || '', !!newPatient, slot.day_label, slot.time_label, reviewToken],
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const patientEmail = appointmentConfirmationEmail({
    patientFirstName: firstName,
    doctorName: `${doctor.name}, ${doctor.credentials}`,
    day: slot.day_label,
    time: slot.time_label,
    address: doctor.address,
  })
  const confirmationResult = await sendEmail({ to: email, ...patientEmail })

  const doctorAlert = newBookingAlertEmail({
    doctorFirstName: doctor.name.split(' ')[0],
    patientName: `${firstName} ${lastName}`,
    day: slot.day_label,
    time: slot.time_label,
    reason,
  })
  await sendEmail({ to: doctor.email, ...doctorAlert })

  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [id])
  res.status(201).json({ ...rows[0], emailSent: confirmationResult.sent })
})

router.get('/doctors/me/appointments', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM appointments WHERE doctor_id = $1 ORDER BY created_at DESC', [req.doctorId])
  res.json(rows)
})

router.post('/doctors/me/slots', requireAuth, async (req, res) => {
  const { day, time } = req.body
  if (!day || !time) return res.status(400).json({ error: 'day and time are required' })
  const { rows } = await pool.query(
    'INSERT INTO doctor_slots (doctor_id, day_label, time_label) VALUES ($1, $2, $3) RETURNING id',
    [req.doctorId, day, time],
  )
  res.status(201).json({ id: rows[0].id, day, time })
})

router.delete('/doctors/me/slots/:id', requireAuth, async (req, res) => {
  const result = await pool.query(
    'DELETE FROM doctor_slots WHERE id = $1 AND doctor_id = $2 AND is_booked = FALSE',
    [req.params.id, req.doctorId],
  )
  if (result.rowCount === 0) return res.status(404).json({ error: 'Slot not found or already booked' })
  res.status(204).end()
})

// Public reviews for a doctor's profile — replaces the old hardcoded sample
// reviews with real ones tied to actual appointments.
router.get('/doctors/:id/reviews', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT patient_name, rating, comment, created_at FROM reviews WHERE doctor_id = $1 ORDER BY created_at DESC LIMIT 20',
    [req.params.id],
  )
  res.json(rows)
})

// A patient reaches this via the link shown after booking (and emailed, if
// email is configured) — no login required, gated only by the per-
// appointment token so it can't be guessed or reused for someone else's visit.
router.get('/appointments/review/:token', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.patient_first_name, a.doctor_id, d.name as doctor_name, d.credentials as doctor_credentials,
            EXISTS(SELECT 1 FROM reviews WHERE appointment_id = a.id) as already_reviewed
     FROM appointments a JOIN doctors d ON d.id = a.doctor_id
     WHERE a.review_token = $1`,
    [req.params.token],
  )
  const row = rows[0]
  if (!row) return res.status(404).json({ error: 'This review link is invalid.' })
  res.json({
    doctorId: row.doctor_id,
    doctorName: `${row.doctor_name}, ${row.doctor_credentials}`,
    patientFirstName: row.patient_first_name,
    alreadyReviewed: row.already_reviewed,
  })
})

router.post('/appointments/review/:token', async (req, res) => {
  const { rating, comment } = req.body
  const ratingNum = Number(rating)
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' })
  }

  const { rows } = await pool.query(
    'SELECT id, doctor_id, patient_first_name, patient_last_name FROM appointments WHERE review_token = $1',
    [req.params.token],
  )
  const appt = rows[0]
  if (!appt) return res.status(404).json({ error: 'This review link is invalid.' })

  const { rows: existing } = await pool.query('SELECT 1 FROM reviews WHERE appointment_id = $1', [appt.id])
  if (existing[0]) return res.status(409).json({ error: 'A review has already been submitted for this appointment.' })

  const patientName = `${appt.patient_first_name} ${(appt.patient_last_name || '?')[0]}.`
  await pool.query(
    'INSERT INTO reviews (id, appointment_id, doctor_id, patient_name, rating, comment) VALUES ($1,$2,$3,$4,$5,$6)',
    [crypto.randomUUID(), appt.id, appt.doctor_id, patientName, ratingNum, comment || ''],
  )

  const { rows: agg } = await pool.query(
    'SELECT AVG(rating)::numeric(3,1) as avg, COUNT(*)::int as count FROM reviews WHERE doctor_id = $1',
    [appt.doctor_id],
  )
  await pool.query('UPDATE doctors SET rating = $1, review_count = $2 WHERE id = $3', [agg[0].avg, agg[0].count, appt.doctor_id])

  res.status(201).json({ ok: true })
})

export default router
