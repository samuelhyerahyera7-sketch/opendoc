import { Router } from 'express'
import crypto from 'node:crypto'
import db from '../db.mjs'
import { hashPassword, verifyPassword, createSession, requireAuth } from '../auth.mjs'
import { serializeDoctor } from '../serialize.mjs'
import { specialtiesList, insurancesList } from '../seed.mjs'

const router = Router()

router.get('/specialties', (req, res) => {
  res.json(specialtiesList)
})

router.get('/insurances', (req, res) => {
  res.json(insurancesList)
})

router.get('/doctors', (req, res) => {
  const { q = '', insurance = '', acceptingOnly, sort = 'relevance' } = req.query

  let rows = db.prepare('SELECT * FROM doctors').all()

  const query = String(q).trim().toLowerCase()
  if (query) {
    rows = rows.filter(
      (d) =>
        d.specialty.toLowerCase().includes(query) ||
        d.name.toLowerCase().includes(query) ||
        (d.city || '').toLowerCase().includes(query),
    )
  }

  if (insurance) {
    const withIns = new Set(
      db.prepare('SELECT doctor_id FROM doctor_insurances WHERE insurance = ?').all(insurance).map((r) => r.doctor_id),
    )
    rows = rows.filter((d) => withIns.has(d.id))
  }

  if (acceptingOnly === 'true') {
    rows = rows.filter((d) => d.accepting_new)
  }

  let doctors = rows.map((r) => serializeDoctor(r))

  if (sort === 'rating') doctors = doctors.sort((a, b) => b.rating - a.rating)

  res.json(doctors)
})

router.get('/doctors/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.doctorId)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(serializeDoctor(row, { includePrivate: true }))
})

router.patch('/doctors/me', requireAuth, (req, res) => {
  const { bio, address, city, acceptingNew, insurances } = req.body

  db.prepare(
    'UPDATE doctors SET bio = COALESCE(?, bio), address = COALESCE(?, address), city = COALESCE(?, city), accepting_new = COALESCE(?, accepting_new) WHERE id = ?',
  ).run(bio ?? null, address ?? null, city ?? null, acceptingNew === undefined ? null : acceptingNew ? 1 : 0, req.doctorId)

  if (Array.isArray(insurances)) {
    db.prepare('DELETE FROM doctor_insurances WHERE doctor_id = ?').run(req.doctorId)
    const insert = db.prepare('INSERT OR IGNORE INTO doctor_insurances (doctor_id, insurance) VALUES (?, ?)')
    for (const ins of insurances) insert.run(req.doctorId, ins)
  }

  const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.doctorId)
  res.json(serializeDoctor(row, { includePrivate: true }))
})

router.get('/doctors/directory/search', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  if (q.length < 2) return res.json([])
  const rows = db
    .prepare('SELECT * FROM doctors WHERE id != ? AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ?) LIMIT 8')
    .all(req.doctorId, `%${q}%`, `%${q}%`)
  res.json(rows.map((r) => ({ id: r.id, name: r.name, credentials: r.credentials, specialty: r.specialty, email: r.email, photo: r.photo })))
})

router.get('/doctors/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Doctor not found' })
  res.json(serializeDoctor(row))
})

router.post('/doctors/register', (req, res) => {
  const { name, credentials, specialty, email, password, address, city, bio, insurances } = req.body

  if (!name || !specialty || !email || !password) {
    return res.status(400).json({ error: 'name, specialty, email, and password are required' })
  }

  const existing = db.prepare('SELECT id FROM doctors WHERE email = ?').get(String(email).toLowerCase())
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' })

  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO doctors (id, name, credentials, specialty, email, password_hash, photo, address, city, bio, education, languages, accepting_new, rating, review_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 5.0, 0)`,
  ).run(
    id,
    name,
    credentials || 'MD',
    specialty,
    String(email).toLowerCase(),
    hashPassword(password),
    `https://i.pravatar.cc/300?u=${id}`,
    address || '',
    city || '',
    bio || '',
    JSON.stringify([]),
    JSON.stringify(['English']),
  )

  if (Array.isArray(insurances)) {
    const insert = db.prepare('INSERT OR IGNORE INTO doctor_insurances (doctor_id, insurance) VALUES (?, ?)')
    for (const ins of insurances) insert.run(id, ins)
  }

  const token = createSession(id)
  const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(id)
  res.status(201).json({ token, doctor: serializeDoctor(row, { includePrivate: true }) })
})

router.post('/doctors/login', (req, res) => {
  const { email, password } = req.body
  const row = db.prepare('SELECT * FROM doctors WHERE email = ?').get(String(email || '').toLowerCase())
  if (!row || !verifyPassword(password || '', row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const token = createSession(row.id)
  res.json({ token, doctor: serializeDoctor(row, { includePrivate: true }) })
})

export default router
