import crypto from 'node:crypto'
import pool from './db.mjs'

export async function notify(doctorId, type, title, body, link) {
  await pool.query(
    'INSERT INTO notifications (id, doctor_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5, $6)',
    [crypto.randomUUID(), doctorId, type, title, body || '', link || null],
  )
}

export async function notifyPatient(patientId, type, title, body, link) {
  await pool.query(
    'INSERT INTO patient_notifications (id, patient_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5, $6)',
    [crypto.randomUUID(), patientId, type, title, body || '', link || null],
  )
}
