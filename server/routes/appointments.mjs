import { Router } from 'express'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import { requireAuth } from '../auth.mjs'

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

  const id = crypto.randomUUID()

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
        (id, doctor_id, slot_id, patient_first_name, patient_last_name, patient_email, patient_phone, reason, new_patient, day_label, time_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, doctorId, slotId, firstName, lastName, email, phone, reason || '', !!newPatient, slot.day_label, slot.time_label],
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [id])
  res.status(201).json(rows[0])
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

export default router
