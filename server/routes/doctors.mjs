import { Router } from 'express'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import { hashPassword, verifyPassword, createSession, requireAuth } from '../auth.mjs'
import { serializeDoctor } from '../serialize.mjs'
import { specialtiesList, insurancesList, medicalAidsList, CASH_OPTION } from '../seed.mjs'
import { haversineKm } from '../geo.mjs'

const router = Router()

router.get('/specialties', (req, res) => {
  res.json(specialtiesList)
})

// Full filter list for patient search: cash/self-pay first, then medical aid schemes.
router.get('/insurances', (req, res) => {
  res.json(insurancesList)
})

// Medical aid schemes only (no cash option) — used on the provider signup form,
// where cash acceptance is its own checkbox rather than a scheme to select.
router.get('/medical-aids', (req, res) => {
  res.json(medicalAidsList)
})

// How many doctors accept each payment option — powers the medical aid hub
// page so patients can see coverage at a glance before clicking in.
router.get('/insurances/stats', async (req, res) => {
  const [insuranceCounts, cashCount] = await Promise.all([
    pool.query('SELECT insurance, COUNT(DISTINCT doctor_id)::int as count FROM doctor_insurances GROUP BY insurance'),
    pool.query('SELECT COUNT(*)::int as count FROM doctors WHERE accepts_cash = TRUE'),
  ])
  const counts = new Map(insuranceCounts.rows.map((r) => [r.insurance, r.count]))

  const stats = [
    { name: CASH_OPTION, count: cashCount.rows[0].count, isCash: true },
    ...medicalAidsList.map((name) => ({ name, count: counts.get(name) || 0, isCash: false })),
  ]
  res.json(stats)
})

router.get('/doctors', async (req, res) => {
  const { q = '', insurance = '', specialty = '', acceptingOnly, sort = 'relevance', lat, lng, radiusKm } = req.query
  const userLat = lat !== undefined ? parseFloat(lat) : null
  const userLng = lng !== undefined ? parseFloat(lng) : null
  const hasLocation = userLat !== null && userLng !== null && !Number.isNaN(userLat) && !Number.isNaN(userLng)
  const radius = radiusKm !== undefined ? parseFloat(radiusKm) : null

  const { rows } = await pool.query('SELECT * FROM doctors')
  let filtered = rows

  const query = String(q).trim().toLowerCase()
  if (query) {
    filtered = filtered.filter(
      (d) =>
        d.specialty.toLowerCase().includes(query) ||
        d.name.toLowerCase().includes(query) ||
        (d.city || '').toLowerCase().includes(query),
    )
  }

  if (specialty) {
    filtered = filtered.filter((d) => d.specialty === specialty)
  }

  if (insurance === CASH_OPTION) {
    filtered = filtered.filter((d) => d.accepts_cash)
  } else if (insurance) {
    const { rows: insRows } = await pool.query('SELECT doctor_id FROM doctor_insurances WHERE insurance = $1', [insurance])
    const withIns = new Set(insRows.map((r) => r.doctor_id))
    filtered = filtered.filter((d) => withIns.has(d.id))
  }

  if (acceptingOnly === 'true') {
    filtered = filtered.filter((d) => d.accepting_new)
  }

  let withDistance
  if (hasLocation) {
    withDistance = filtered
      .filter((d) => d.lat !== null && d.lng !== null)
      .map((d) => ({ row: d, distanceKm: haversineKm(userLat, userLng, d.lat, d.lng) }))
      .filter((d) => !radius || d.distanceKm <= radius)
  } else {
    withDistance = filtered.map((d) => ({ row: d, distanceKm: null }))
  }

  let doctors = await Promise.all(withDistance.map((d) => serializeDoctor(d.row, { distanceKm: d.distanceKm })))

  if (sort === 'rating') {
    doctors.sort((a, b) => b.rating - a.rating)
  } else if (sort === 'distance' || (hasLocation && sort === 'relevance')) {
    doctors.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  }

  res.json(doctors)
})

router.get('/doctors/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.doctorId])
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

router.patch('/doctors/me', requireAuth, async (req, res) => {
  const { bio, address, city, lat, lng, acceptingNew, acceptsCash, insurances } = req.body

  await pool.query(
    `UPDATE doctors SET bio = COALESCE($1, bio), address = COALESCE($2, address), city = COALESCE($3, city),
       lat = COALESCE($4, lat), lng = COALESCE($5, lng),
       accepting_new = COALESCE($6, accepting_new), accepts_cash = COALESCE($7, accepts_cash) WHERE id = $8`,
    [
      bio ?? null,
      address ?? null,
      city ?? null,
      typeof lat === 'number' ? lat : null,
      typeof lng === 'number' ? lng : null,
      acceptingNew === undefined ? null : !!acceptingNew,
      acceptsCash === undefined ? null : !!acceptsCash,
      req.doctorId,
    ],
  )

  if (Array.isArray(insurances)) {
    await pool.query('DELETE FROM doctor_insurances WHERE doctor_id = $1', [req.doctorId])
    for (const ins of insurances) {
      if (ins === CASH_OPTION) continue
      await pool.query('INSERT INTO doctor_insurances (doctor_id, insurance) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.doctorId, ins])
    }
  }

  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.doctorId])
  res.json(await serializeDoctor(rows[0], { includePrivate: true }))
})

router.get('/doctors/directory/search', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  if (q.length < 2) return res.json([])
  const { rows } = await pool.query(
    'SELECT * FROM doctors WHERE id != $1 AND (LOWER(name) LIKE $2 OR LOWER(email) LIKE $2) LIMIT 8',
    [req.doctorId, `%${q}%`],
  )
  res.json(rows.map((r) => ({ id: r.id, name: r.name, credentials: r.credentials, specialty: r.specialty, email: r.email, photo: r.photo })))
})

router.get('/doctors/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' })
  res.json(await serializeDoctor(rows[0]))
})

router.post('/doctors/register', async (req, res) => {
  const { name, credentials, specialty, email, password, address, city, lat, lng, bio, insurances, acceptsCash } = req.body

  if (!name || !specialty || !email || !password) {
    return res.status(400).json({ error: 'name, specialty, email, and password are required' })
  }

  const { rows: existingRows } = await pool.query('SELECT id FROM doctors WHERE email = $1', [String(email).toLowerCase()])
  if (existingRows[0]) return res.status(409).json({ error: 'An account with this email already exists' })

  const insuranceSelections = Array.isArray(insurances) ? insurances : []
  const wantsCash = acceptsCash !== undefined ? !!acceptsCash : insuranceSelections.includes(CASH_OPTION)

  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO doctors (id, name, credentials, specialty, email, password_hash, photo, address, city, lat, lng, bio, education, languages, accepting_new, accepts_cash, rating, review_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, TRUE, $15, 5.0, 0)`,
    [
      id,
      name,
      credentials || 'MD',
      specialty,
      String(email).toLowerCase(),
      hashPassword(password),
      `https://i.pravatar.cc/300?u=${id}`,
      address || '',
      city || '',
      typeof lat === 'number' ? lat : null,
      typeof lng === 'number' ? lng : null,
      bio || '',
      JSON.stringify([]),
      JSON.stringify(['English']),
      wantsCash,
    ],
  )

  for (const ins of insuranceSelections) {
    if (ins === CASH_OPTION) continue
    await pool.query('INSERT INTO doctor_insurances (doctor_id, insurance) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, ins])
  }

  const token = await createSession(id)
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [id])
  res.status(201).json({ token, doctor: await serializeDoctor(rows[0], { includePrivate: true }) })
})

router.post('/doctors/login', async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query('SELECT * FROM doctors WHERE email = $1', [String(email || '').toLowerCase()])
  const row = rows[0]
  if (!row || !verifyPassword(password || '', row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const token = await createSession(row.id)
  res.json({ token, doctor: await serializeDoctor(row, { includePrivate: true }) })
})

export default router
