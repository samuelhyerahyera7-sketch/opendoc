// Integration tests for Stage 1: provider verification enforcement and
// admin authentication. Runs against DATABASE_URL (same one the dev server
// uses) — all test data uses randomized emails/HPCSA numbers and is cleaned
// up in `after()`, so it never touches real seeded/demo/production rows.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import 'dotenv/config'
import http from 'node:http'
import crypto from 'node:crypto'
import app from './app.mjs'
import pool from './db.mjs'
import { hashPassword } from './auth.mjs'

let server
let baseUrl
const cleanupDoctorIds = []
const cleanupAdminIds = []

before(async () => {
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (cleanupDoctorIds.length) {
    await pool.query('DELETE FROM doctors WHERE id = ANY($1)', [cleanupDoctorIds])
  }
  if (cleanupAdminIds.length) {
    await pool.query('DELETE FROM admin_users WHERE id = ANY($1)', [cleanupAdminIds])
  }
  await new Promise((resolve) => server.close(resolve))
  await pool.end()
})

function unique() {
  return crypto.randomBytes(6).toString('hex')
}

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body, headers: res.headers }
}

async function createTestDoctor(status = 'pending') {
  const id = crypto.randomUUID()
  const suffix = unique()
  await pool.query(
    `INSERT INTO doctors
      (id, name, credentials, specialty, email, password_hash, photo, address, city, hpcsa_number, verification_status, email_verified, accepting_new, accepts_cash, rating, review_count, education, languages)
     VALUES ($1,'Test Doctor','MD','General Practice',$2,$3,'','','',$4,$5,TRUE,TRUE,TRUE,5.0,0,'[]','[]')`,
    [id, `test-${suffix}@example.com`, hashPassword('testpass123'), `TEST${suffix}`, status],
  )
  cleanupDoctorIds.push(id)
  return id
}

async function createTestAdmin(role = 'super_admin') {
  const id = crypto.randomUUID()
  const email = `admin-${unique()}@example.com`
  await pool.query('INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1,$2,$3,$4)', [
    id,
    email,
    hashPassword('AdminPass123!'),
    role,
  ])
  cleanupAdminIds.push(id)
  return { id, email, password: 'AdminPass123!' }
}

test('public search only returns verified doctors', async () => {
  const pendingId = await createTestDoctor('pending')
  const verifiedId = await createTestDoctor('verified')
  const rejectedId = await createTestDoctor('rejected')

  const { body } = await api('/doctors')
  const ids = body.map((d) => d.id)
  assert.ok(ids.includes(verifiedId), 'verified doctor should be in search results')
  assert.ok(!ids.includes(pendingId), 'pending doctor must not be in search results')
  assert.ok(!ids.includes(rejectedId), 'rejected doctor must not be in search results')
})

test('a rejected doctor profile 404s for the public, exactly like a nonexistent one', async () => {
  const rejectedId = await createTestDoctor('rejected')
  const { status, body } = await api(`/doctors/${rejectedId}`)
  assert.equal(status, 404)
  assert.equal(body.error, 'Doctor not found')
})

test('a pending doctor cannot be booked even with a valid slot id', async () => {
  const pendingId = await createTestDoctor('pending')
  const { rows } = await pool.query(
    "INSERT INTO doctor_slots (doctor_id, day_label, time_label) VALUES ($1, 'Mon', '09:00 AM') RETURNING id",
    [pendingId],
  )
  const slotId = rows[0].id

  // Register + log in a throwaway patient to get a valid patient session.
  const patientEmail = `patient-${unique()}@example.com`
  const reg = await api('/patients/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Pat', lastName: 'Ient', email: patientEmail, password: 'testpass123' }),
  })
  assert.equal(reg.status, 201)
  const patientToken = reg.body.token

  const { status, body } = await api('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      doctorId: pendingId,
      slotId,
      firstName: 'Pat',
      lastName: 'Ient',
      email: patientEmail,
      phone: '0821234567',
    }),
  })
  assert.equal(status, 403)
  assert.match(body.error, /not currently accepting bookings/)

  await pool.query('DELETE FROM patients WHERE email = $1', [patientEmail])
})

test('duplicate HPCSA number is rejected at registration', async () => {
  const suffix = unique()
  const hpcsa = `MP${suffix}`
  const email1 = `dup1-${suffix}@example.com`
  const email2 = `dup2-${suffix}@example.com`

  const first = await api('/doctors/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Doctor One',
      specialty: 'General Practice',
      email: email1,
      password: 'testpass123',
      hpcsaNumber: hpcsa,
    }),
  })
  assert.equal(first.status, 201)
  cleanupDoctorIds.push(first.body.doctor.id)

  const second = await api('/doctors/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Doctor Two',
      specialty: 'General Practice',
      email: email2,
      password: 'testpass123',
      hpcsaNumber: hpcsa.toLowerCase(), // same number, different case — must still collide
    }),
  })
  assert.equal(second.status, 409)
  assert.match(second.body.error, /already registered/)
})

test('weak passwords are rejected at doctor registration', async () => {
  const { status, body } = await api('/doctors/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Weak Pw',
      specialty: 'General Practice',
      email: `weak-${unique()}@example.com`,
      password: 'alllettersnodigits',
      hpcsaNumber: `MP${unique()}`,
    }),
  })
  assert.equal(status, 400)
  assert.match(body.error, /letters and numbers/)
})

test('admin login sets a session cookie and /admin/me reflects it; wrong password is rejected', async () => {
  const admin = await createTestAdmin('super_admin')

  const bad = await api('/admin/login', { method: 'POST', body: JSON.stringify({ email: admin.email, password: 'wrong-password' }) })
  assert.equal(bad.status, 401)

  const res = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  })
  assert.equal(res.status, 200)
  const cookie = res.headers.get('set-cookie')
  assert.ok(cookie?.includes('opendoc_admin_session='), 'login must set the admin session cookie')
  assert.ok(cookie.includes('HttpOnly'), 'admin cookie must be HttpOnly')

  const meRes = await fetch(`${baseUrl}/api/admin/me`, { headers: { Cookie: cookie.split(';')[0] } })
  assert.equal(meRes.status, 200)
  const me = await meRes.json()
  assert.equal(me.email, admin.email)
  assert.equal(me.role, 'super_admin')
})

test('admin endpoints reject requests with no session cookie', async () => {
  const { status } = await api('/admin/doctors')
  assert.equal(status, 401)
})

test('a support_admin cannot verify a doctor (role-based access control)', async () => {
  const admin = await createTestAdmin('support_admin')
  const pendingId = await createTestDoctor('pending')

  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  })
  const cookie = loginRes.headers.get('set-cookie').split(';')[0]

  const verifyRes = await fetch(`${baseUrl}/api/admin/doctors/${pendingId}/verify`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  assert.equal(verifyRes.status, 403)
})

test('verifying a doctor records who/when and writes an audit log entry', async () => {
  const admin = await createTestAdmin('verification_admin')
  const pendingId = await createTestDoctor('pending')

  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  })
  const cookie = loginRes.headers.get('set-cookie').split(';')[0]

  const verifyRes = await fetch(`${baseUrl}/api/admin/doctors/${pendingId}/verify`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'checked HPCSA portal' }),
  })
  assert.equal(verifyRes.status, 200)
  const updated = await verifyRes.json()
  assert.equal(updated.verificationStatus, 'verified')
  assert.equal(updated.verificationNotes, 'checked HPCSA portal')
  assert.ok(updated.verifiedAt)

  const { rows } = await pool.query(
    "SELECT * FROM admin_audit_log WHERE action = 'PROVIDER_VERIFIED' AND resource_id = $1",
    [pendingId],
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].admin_email, admin.email)
})

test('rejecting a doctor revokes their existing sessions', async () => {
  const pendingId = await createTestDoctor('pending')
  const { createSession, getDoctorIdForToken } = await import('./auth.mjs')
  const doctorToken = await createSession(pendingId)
  assert.equal(await getDoctorIdForToken(doctorToken), pendingId)

  const admin = await createTestAdmin('verification_admin')
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  })
  const cookie = loginRes.headers.get('set-cookie').split(';')[0]

  await fetch(`${baseUrl}/api/admin/doctors/${pendingId}/reject`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'invalid HPCSA number' }),
  })

  assert.equal(await getDoctorIdForToken(doctorToken), null, 'session should be revoked after rejection')
})
