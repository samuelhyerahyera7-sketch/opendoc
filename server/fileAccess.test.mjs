// Tests the patient-file permission fix: uploading a file and transferring
// it does not grant the recipient permission to forward it again. Covers
// the exact scenario flagged in the security review — Doctor A uploads a
// file, transfers it to Doctor B, and Doctor B must NOT be able to forward
// it to Doctor C.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import 'dotenv/config'
import http from 'node:http'
import crypto from 'node:crypto'
import app from './app.mjs'
import pool from './db.mjs'
import { hashPassword, createSession } from './auth.mjs'

let server
let baseUrl
const cleanupDoctorIds = []

before(async () => {
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (cleanupDoctorIds.length) {
    await pool.query('DELETE FROM doctors WHERE id = ANY($1)', [cleanupDoctorIds])
  }
  await new Promise((resolve) => server.close(resolve))
  await pool.end()
})

function unique() {
  return crypto.randomBytes(6).toString('hex')
}

async function createTestDoctor() {
  const id = crypto.randomUUID()
  const suffix = unique()
  await pool.query(
    `INSERT INTO doctors
      (id, name, credentials, specialty, email, password_hash, photo, address, city, hpcsa_number, verification_status, email_verified, accepting_new, accepts_cash, rating, review_count, education, languages)
     VALUES ($1,'Test Doctor','MD','General Practice',$2,$3,'','','',$4,'verified',TRUE,TRUE,TRUE,5.0,0,'[]','[]')`,
    [id, `test-${suffix}@example.com`, hashPassword('testpass123'), `TEST${suffix}`],
  )
  cleanupDoctorIds.push(id)
  const token = await createSession(id)
  return { id, token }
}

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

// Minimal valid PDF bytes, so the magic-byte check in files.mjs passes.
const FAKE_PDF = Buffer.from('%PDF-1.4\n%%EOF')

async function uploadFile(doctorToken) {
  const form = new FormData()
  form.append('file', new Blob([FAKE_PDF], { type: 'application/pdf' }), 'test.pdf')
  form.append('patientFirstName', 'Jane')
  form.append('patientLastName', 'Doe')
  const res = await fetch(`${baseUrl}/api/doctors/me/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorToken}` },
    body: form,
  })
  return { status: res.status, body: await res.json() }
}

test('uploading a non-PDF-looking file claiming to be a PDF is rejected', async () => {
  const doctorA = await createTestDoctor()
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('not actually a pdf')], { type: 'application/pdf' }), 'fake.pdf')
  form.append('patientFirstName', 'Jane')
  form.append('patientLastName', 'Doe')
  const res = await fetch(`${baseUrl}/api/doctors/me/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorA.token}` },
    body: form,
  })
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.match(body.error, /does not appear to be a valid file/)
})

test('a disallowed file type is rejected even with a spoofed extension', async () => {
  const doctorA = await createTestDoctor()
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('#!/bin/sh\necho hi')], { type: 'application/x-sh' }), 'script.pdf')
  form.append('patientFirstName', 'Jane')
  form.append('patientLastName', 'Doe')
  const res = await fetch(`${baseUrl}/api/doctors/me/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorA.token}` },
    body: form,
  })
  assert.equal(res.status, 400)
})

test('a transfer without consent confirmation is rejected', async () => {
  const doctorA = await createTestDoctor()
  const doctorB = await createTestDoctor()
  const upload = await uploadFile(doctorA.token)
  assert.equal(upload.status, 201)

  const { status, body } = await api(`/files/${upload.body.id}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorA.token}` },
    body: JSON.stringify({ toDoctorId: doctorB.id, consentConfirmed: false }),
  })
  assert.equal(status, 400)
  assert.match(body.error, /consent/)
})

test('Doctor A uploads a file, transfers it to Doctor B; Doctor B can view/download it', async () => {
  const doctorA = await createTestDoctor()
  const doctorB = await createTestDoctor()
  const upload = await uploadFile(doctorA.token)
  assert.equal(upload.status, 201)

  const transfer = await api(`/files/${upload.body.id}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorA.token}` },
    body: JSON.stringify({ toDoctorId: doctorB.id, consentConfirmed: true, consentBasis: 'Referral for specialist care' }),
  })
  assert.equal(transfer.status, 201)

  const download = await fetch(`${baseUrl}/api/files/${upload.body.id}/download`, {
    headers: { Authorization: `Bearer ${doctorB.token}` },
  })
  assert.equal(download.status, 200)
})

test('CRITICAL: Doctor B (a transfer recipient) cannot forward the file to Doctor C', async () => {
  const doctorA = await createTestDoctor()
  const doctorB = await createTestDoctor()
  const doctorC = await createTestDoctor()
  const upload = await uploadFile(doctorA.token)

  const transferToB = await api(`/files/${upload.body.id}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorA.token}` },
    body: JSON.stringify({ toDoctorId: doctorB.id, consentConfirmed: true }),
  })
  assert.equal(transferToB.status, 201)

  // Doctor B — who only received this file, never uploaded it — tries to
  // forward it onward to Doctor C. This must be denied.
  const transferToC = await api(`/files/${upload.body.id}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorB.token}` },
    body: JSON.stringify({ toDoctorId: doctorC.id, consentConfirmed: true }),
  })
  assert.equal(transferToC.status, 403)
  assert.match(transferToC.body.error, /Only the doctor who uploaded/)

  // And Doctor C, having never been given access at all, cannot download it.
  const download = await fetch(`${baseUrl}/api/files/${upload.body.id}/download`, {
    headers: { Authorization: `Bearer ${doctorC.token}` },
  })
  assert.equal(download.status, 403)
})

test('a doctor with no relationship to a file cannot download it, and the denial is logged', async () => {
  const doctorA = await createTestDoctor()
  const stranger = await createTestDoctor()
  const upload = await uploadFile(doctorA.token)

  const res = await fetch(`${baseUrl}/api/files/${upload.body.id}/download`, {
    headers: { Authorization: `Bearer ${stranger.token}` },
  })
  assert.equal(res.status, 403)

  const { rows } = await pool.query(
    "SELECT * FROM file_access_log WHERE file_id = $1 AND action = 'access_denied' AND doctor_id = $2",
    [upload.body.id, stranger.id],
  )
  assert.equal(rows.length, 1)
})

test('upload, transfer, and download are all recorded in the file access audit log', async () => {
  const doctorA = await createTestDoctor()
  const doctorB = await createTestDoctor()
  const upload = await uploadFile(doctorA.token)

  await api(`/files/${upload.body.id}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorA.token}` },
    body: JSON.stringify({ toDoctorId: doctorB.id, consentConfirmed: true }),
  })
  await fetch(`${baseUrl}/api/files/${upload.body.id}/download`, {
    headers: { Authorization: `Bearer ${doctorB.token}` },
  })

  const { rows } = await pool.query(
    'SELECT action FROM file_access_log WHERE file_id = $1 ORDER BY created_at ASC',
    [upload.body.id],
  )
  assert.deepEqual(rows.map((r) => r.action), ['upload', 'transfer', 'download'])
})
