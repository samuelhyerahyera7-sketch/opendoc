import { Router } from 'express'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import { requireAuth, optionalPatientAuth, requireDoctorOrPatientAuth } from '../auth.mjs'
import { sendEmail, appointmentConfirmationEmail, newBookingAlertEmail, appointmentCancelledEmail, appointmentRescheduledEmail } from '../email.mjs'
import { notify, notifyPatient } from '../notifications.mjs'

const router = Router()

router.post('/appointments', optionalPatientAuth, async (req, res) => {
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
        (id, doctor_id, slot_id, patient_first_name, patient_last_name, patient_email, patient_phone, reason, new_patient, day_label, time_label, review_token, patient_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, doctorId, slotId, firstName, lastName, email, phone, reason || '', !!newPatient, slot.day_label, slot.time_label, reviewToken, req.patientId],
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

  await notify(
    doctorId,
    'new_appointment',
    `New appointment: ${firstName} ${lastName}`,
    `${slot.day_label} at ${slot.time_label}${reason ? ` — ${reason}` : ''}`,
    '/provider/dashboard',
  )

  if (req.patientId) {
    await notifyPatient(
      req.patientId,
      'appointment_confirmed',
      `Appointment confirmed with ${doctor.name}, ${doctor.credentials}`,
      `${slot.day_label} at ${slot.time_label}`,
      '/patient/dashboard',
    )
  }

  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [id])
  res.status(201).json({ ...rows[0], emailSent: confirmationResult.sent })
})

router.get('/doctors/me/appointments', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM appointments WHERE doctor_id = $1 ORDER BY created_at DESC', [req.doctorId])
  res.json(rows)
})

// Cancel and reschedule can be initiated by either party — the doctor
// managing their schedule, or the patient who booked (if they were logged
// in when they did). A guest booking (no account) can't self-serve either
// action yet; that would need its own token-based link like reviews have.
function assertAppointmentAccess(req, res, appt) {
  const isDoctor = req.doctorId && req.doctorId === appt.doctor_id
  const isPatient = req.patientId && req.patientId === appt.patient_id
  if (!isDoctor && !isPatient) {
    res.status(403).json({ error: 'You do not have access to this appointment' })
    return false
  }
  return true
}

router.post('/appointments/:id/cancel', requireDoctorOrPatientAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, d.name as doctor_name, d.credentials as doctor_credentials, d.email as doctor_email
     FROM appointments a JOIN doctors d ON d.id = a.doctor_id WHERE a.id = $1`,
    [req.params.id],
  )
  const appt = rows[0]
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })
  if (!assertAppointmentAccess(req, res, appt)) return
  if (appt.status === 'cancelled') return res.status(409).json({ error: 'This appointment is already cancelled' })

  await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', ['cancelled', appt.id])
  await pool.query('UPDATE doctor_slots SET is_booked = FALSE WHERE id = $1', [appt.slot_id])

  const cancelledByDoctor = !!req.doctorId
  const doctorName = `${appt.doctor_name}, ${appt.doctor_credentials}`
  const patientName = `${appt.patient_first_name} ${appt.patient_last_name}`

  if (cancelledByDoctor) {
    const { subject, html } = appointmentCancelledEmail({
      recipientName: appt.patient_first_name,
      doctorName,
      patientName,
      day: appt.day_label,
      time: appt.time_label,
      cancelledByDoctor: true,
    })
    await sendEmail({ to: appt.patient_email, subject, html })
    if (appt.patient_id) {
      await notifyPatient(appt.patient_id, 'appointment_cancelled', `Appointment cancelled by ${doctorName}`, `${appt.day_label} at ${appt.time_label}`, '/patient/dashboard')
    }
  } else {
    const { subject, html } = appointmentCancelledEmail({
      recipientName: appt.doctor_name.split(' ')[0],
      doctorName,
      patientName,
      day: appt.day_label,
      time: appt.time_label,
      cancelledByDoctor: false,
    })
    await sendEmail({ to: appt.doctor_email, subject, html })
    await notify(appt.doctor_id, 'appointment_cancelled', `${patientName} cancelled their appointment`, `${appt.day_label} at ${appt.time_label}`, '/provider/dashboard')
  }

  res.json({ ok: true })
})

router.post('/appointments/:id/reschedule', requireDoctorOrPatientAuth, async (req, res) => {
  const { newSlotId } = req.body
  if (!newSlotId) return res.status(400).json({ error: 'newSlotId is required' })

  const { rows } = await pool.query(
    `SELECT a.*, d.name as doctor_name, d.credentials as doctor_credentials, d.email as doctor_email
     FROM appointments a JOIN doctors d ON d.id = a.doctor_id WHERE a.id = $1`,
    [req.params.id],
  )
  const appt = rows[0]
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })
  if (!assertAppointmentAccess(req, res, appt)) return
  if (appt.status === 'cancelled') return res.status(409).json({ error: 'This appointment is cancelled' })

  const { rows: slotRows } = await pool.query('SELECT * FROM doctor_slots WHERE id = $1 AND doctor_id = $2', [newSlotId, appt.doctor_id])
  const newSlot = slotRows[0]
  if (!newSlot) return res.status(404).json({ error: 'That time slot could not be found' })
  if (newSlot.is_booked) return res.status(409).json({ error: 'That time slot is already booked' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const bookResult = await client.query('UPDATE doctor_slots SET is_booked = TRUE WHERE id = $1 AND is_booked = FALSE', [newSlotId])
    if (bookResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'That time slot was just booked by someone else' })
    }
    await client.query('UPDATE doctor_slots SET is_booked = FALSE WHERE id = $1', [appt.slot_id])
    await client.query(
      'UPDATE appointments SET slot_id = $1, day_label = $2, time_label = $3 WHERE id = $4',
      [newSlotId, newSlot.day_label, newSlot.time_label, appt.id],
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const rescheduledByDoctor = !!req.doctorId
  const doctorName = `${appt.doctor_name}, ${appt.doctor_credentials}`
  const patientName = `${appt.patient_first_name} ${appt.patient_last_name}`
  const emailArgs = {
    doctorName,
    patientName,
    oldDay: appt.day_label,
    oldTime: appt.time_label,
    newDay: newSlot.day_label,
    newTime: newSlot.time_label,
    rescheduledByDoctor,
  }

  if (rescheduledByDoctor) {
    const { subject, html } = appointmentRescheduledEmail({ ...emailArgs, recipientName: appt.patient_first_name })
    await sendEmail({ to: appt.patient_email, subject, html })
    if (appt.patient_id) {
      await notifyPatient(appt.patient_id, 'appointment_rescheduled', `Appointment rescheduled with ${doctorName}`, `Now ${newSlot.day_label} at ${newSlot.time_label}`, '/patient/dashboard')
    }
  } else {
    const { subject, html } = appointmentRescheduledEmail({ ...emailArgs, recipientName: appt.doctor_name.split(' ')[0] })
    await sendEmail({ to: appt.doctor_email, subject, html })
    await notify(appt.doctor_id, 'appointment_rescheduled', `${patientName} rescheduled their appointment`, `Now ${newSlot.day_label} at ${newSlot.time_label}`, '/provider/dashboard')
  }

  const { rows: updated } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appt.id])
  res.json(updated[0])
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

  await notify(
    appt.doctor_id,
    'new_review',
    `New ${ratingNum}-star review from ${patientName}`,
    comment || '',
    `/doctor/${appt.doctor_id}`,
  )

  res.status(201).json({ ok: true })
})

export default router
