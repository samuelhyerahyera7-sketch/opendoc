import { Router } from 'express'
import crypto from 'node:crypto'
import db from '../db.mjs'
import { requireAuth } from '../auth.mjs'

const router = Router()

router.post('/appointments', (req, res) => {
  const { doctorId, slotId, firstName, lastName, email, phone, reason, newPatient } = req.body

  if (!doctorId || !slotId || !firstName || !lastName || !email || !phone) {
    return res.status(400).json({ error: 'Missing required booking fields' })
  }

  const slot = db.prepare('SELECT * FROM doctor_slots WHERE id = ? AND doctor_id = ?').get(slotId, doctorId)
  if (!slot) return res.status(404).json({ error: 'That time slot could not be found' })
  if (slot.is_booked) return res.status(409).json({ error: 'That time slot was just booked by someone else' })

  const id = crypto.randomUUID()

  db.exec('BEGIN')
  try {
    db.prepare('UPDATE doctor_slots SET is_booked = 1 WHERE id = ?').run(slotId)
    db.prepare(
      `INSERT INTO appointments
        (id, doctor_id, slot_id, patient_first_name, patient_last_name, patient_email, patient_phone, reason, new_patient, day_label, time_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, doctorId, slotId, firstName, lastName, email, phone, reason || '', newPatient ? 1 : 0, slot.day_label, slot.time_label)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id)
  res.status(201).json(appt)
})

router.get('/doctors/me/appointments', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM appointments WHERE doctor_id = ? ORDER BY created_at DESC')
    .all(req.doctorId)
  res.json(rows)
})

router.post('/doctors/me/slots', requireAuth, (req, res) => {
  const { day, time } = req.body
  if (!day || !time) return res.status(400).json({ error: 'day and time are required' })
  const result = db.prepare('INSERT INTO doctor_slots (doctor_id, day_label, time_label) VALUES (?, ?, ?)').run(req.doctorId, day, time)
  res.status(201).json({ id: Number(result.lastInsertRowid), day, time })
})

router.delete('/doctors/me/slots/:id', requireAuth, (req, res) => {
  const result = db
    .prepare('DELETE FROM doctor_slots WHERE id = ? AND doctor_id = ? AND is_booked = 0')
    .run(req.params.id, req.doctorId)
  if (result.changes === 0) return res.status(404).json({ error: 'Slot not found or already booked' })
  res.status(204).end()
})

export default router
