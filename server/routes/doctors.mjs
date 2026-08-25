import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import { hashPassword, verifyPassword, createSession, requireAuth, createActionToken, consumeActionToken } from '../auth.mjs'
import { serializeDoctor } from '../serialize.mjs'
import { specialtiesList, insurancesList, medicalAidsList, CASH_OPTION } from '../seed.mjs'
import { haversineKm } from '../geo.mjs'
import { sendEmail, verifyEmailMessage, resetPasswordEmail } from '../email.mjs'
import { uploadFile } from '../storage.mjs'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const router = Router()

const appUrl = () => process.env.APP_URL || 'http://localhost:5173'

// Brute-force protection on the two endpoints that matter most for it.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
})

router.get('/specialties', (req, res) => {
  res.json(specialtiesList)
})

// Full filter list for patient search: cash/self-pay first, then medical aid
// schemes. Includes any custom "Other" scheme a doctor has added that isn't
// in the fixed list, so it's actually findable in search — not just stored.
router.get('/insurances', async (req, res) => {
  const { rows } = await pool.query('SELECT DISTINCT insurance FROM doctor_insurances')
  const known = new Set(medicalAidsList)
  const extras = rows.map((r) => r.insurance).filter((name) => !known.has(name)).sort()
  res.json([...insurancesList, ...extras])
})

// Medical aid schemes only (no cash option) — used on the provider signup form,
// where cash acceptance is its own checkbox rather than a scheme to select.
router.get('/medical-aids', (req, res) => {
  res.json(medicalAidsList)
})

// How many doctors accept each payment option — powers the medical aid hub
// page so patients can see coverage at a glance before clicking in. Also
// surfaces any custom "Other" scheme a doctor added, so it's not invisible.
router.get('/insurances/stats', async (req, res) => {
  const [insuranceCounts, cashCount] = await Promise.all([
    pool.query('SELECT insurance, COUNT(DISTINCT doctor_id)::int as count FROM doctor_insurances GROUP BY insurance'),
    pool.query('SELECT COUNT(*)::int as count FROM doctors WHERE accepts_cash = TRUE'),
  ])
  const counts = new Map(insuranceCounts.rows.map((r) => [r.insurance, r.count]))
  const known = new Set(medicalAidsList)
  const extraNames = [...counts.keys()].filter((name) => !known.has(name)).sort()

  const stats = [
    { name: CASH_OPTION, count: cashCount.rows[0].count, isCash: true },
    ...medicalAidsList.map((name) => ({ name, count: counts.get(name) || 0, isCash: false })),
    ...extraNames.map((name) => ({ name, count: counts.get(name) || 0, isCash: false })),
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

router.post('/doctors/me/photo', requireAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A photo is required' })
  if (!ALLOWED_PHOTO_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({ error: 'Photo must be a JPEG, PNG, or WebP image' })
  }

  const stored = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)
  // Patient files stay behind an authenticated download proxy since they're
  // sensitive; a doctor's profile photo is public by design (shown on
  // search results and profile pages), so it needs a directly renderable
  // URL — Blob already gives us one, the local-disk dev fallback doesn't,
  // so route it through the static /api/uploads mount instead.
  const photoUrl = stored.url.startsWith('local:') ? `/api/uploads/${stored.path}` : stored.url

  await pool.query('UPDATE doctors SET photo = $1 WHERE id = $2', [photoUrl, req.doctorId])
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

router.post('/doctors/register', authLimiter, async (req, res) => {
  const { name, credentials, specialty, email, password, hpcsaNumber, address, city, lat, lng, bio, insurances, acceptsCash } = req.body

  if (!name || !specialty || !email || !password || !hpcsaNumber) {
    return res.status(400).json({ error: 'name, specialty, email, password, and HPCSA registration number are required' })
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const { rows: existingRows } = await pool.query('SELECT id FROM doctors WHERE email = $1', [String(email).toLowerCase()])
  if (existingRows[0]) return res.status(409).json({ error: 'An account with this email already exists' })

  const insuranceSelections = Array.isArray(insurances) ? insurances : []
  const wantsCash = acceptsCash !== undefined ? !!acceptsCash : insuranceSelections.includes(CASH_OPTION)

  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO doctors
      (id, name, credentials, specialty, email, password_hash, photo, address, city, lat, lng, bio, education, languages, accepting_new, accepts_cash, rating, review_count, hpcsa_number, verification_status, email_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, TRUE, $15, 5.0, 0, $16, 'pending', FALSE)`,
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
      String(hpcsaNumber).trim(),
    ],
  )

  for (const ins of insuranceSelections) {
    if (ins === CASH_OPTION) continue
    await pool.query('INSERT INTO doctor_insurances (doctor_id, insurance) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, ins])
  }

  const verifyToken = await createActionToken(id, 'verify_email')
  const { subject, html } = verifyEmailMessage({ name, verifyUrl: `${appUrl()}/verify-email?token=${verifyToken}` })
  await sendEmail({ to: String(email).toLowerCase(), subject, html })

  const token = await createSession(id)
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [id])
  res.status(201).json({ token, doctor: await serializeDoctor(rows[0], { includePrivate: true }) })
})

router.post('/doctors/login', authLimiter, async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query('SELECT * FROM doctors WHERE email = $1', [String(email || '').toLowerCase()])
  const row = rows[0]
  if (!row || !verifyPassword(password || '', row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const token = await createSession(row.id)
  res.json({ token, doctor: await serializeDoctor(row, { includePrivate: true }) })
})

router.get('/doctors/verify-email', async (req, res) => {
  const doctorId = await consumeActionToken(String(req.query.token || ''), 'verify_email')
  if (!doctorId) return res.status(400).json({ error: 'This verification link is invalid or has expired.' })
  await pool.query('UPDATE doctors SET email_verified = TRUE WHERE id = $1', [doctorId])
  res.json({ ok: true })
})

router.post('/doctors/resend-verification', requireAuth, authLimiter, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.doctorId])
  const doctor = rows[0]
  if (!doctor) return res.status(404).json({ error: 'Not found' })
  if (doctor.email_verified) return res.json({ ok: true, alreadyVerified: true })

  const verifyToken = await createActionToken(doctor.id, 'verify_email')
  const { subject, html } = verifyEmailMessage({ name: doctor.name, verifyUrl: `${appUrl()}/verify-email?token=${verifyToken}` })
  const result = await sendEmail({ to: doctor.email, subject, html })
  res.json({ ok: true, emailSent: result.sent })
})

router.post('/doctors/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body
  const { rows } = await pool.query('SELECT * FROM doctors WHERE email = $1', [String(email || '').toLowerCase()])
  const doctor = rows[0]

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to check which emails have provider accounts.
  if (doctor) {
    const resetToken = await createActionToken(doctor.id, 'reset_password')
    const { subject, html } = resetPasswordEmail({ name: doctor.name, resetUrl: `${appUrl()}/reset-password?token=${resetToken}` })
    await sendEmail({ to: doctor.email, subject, html })
  }
  res.json({ ok: true })
})

router.post('/doctors/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const doctorId = await consumeActionToken(String(token || ''), 'reset_password')
  if (!doctorId) return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
  await pool.query('UPDATE doctors SET password_hash = $1 WHERE id = $2', [hashPassword(password), doctorId])
  res.json({ ok: true })
})

export default router
