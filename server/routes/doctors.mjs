import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import crypto from 'node:crypto'
import pool from '../db.mjs'
import {
  hashPassword,
  verifyPassword,
  createSession,
  requireAuth,
  createActionToken,
  consumeActionToken,
  optionalDoctorId,
  revokeAllDoctorSessions,
} from '../auth.mjs'
import { getAdminForToken, ADMIN_COOKIE_NAME } from '../adminAuth.mjs'
import { serializeDoctor } from '../serialize.mjs'
import { specialtiesList, insurancesList, medicalAidsList, CASH_OPTION } from '../seed.mjs'
import { haversineKm } from '../geo.mjs'
import { sendEmail, verifyEmailMessage, resetPasswordEmail } from '../email.mjs'
import { uploadFile } from '../storage.mjs'
import { doctorRegisterSchema, doctorLoginSchema, passwordSchema, validateBody } from '../validation.mjs'

// A doctor is publicly bookable/searchable only once verified. Pending,
// rejected, and suspended doctors keep full access to their own private
// dashboard (requireAuth routes below), but never appear in public search,
// never render a public profile to a stranger, and can never be booked.
const PUBLICLY_VISIBLE_STATUS = 'verified'

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
  const { q = '', insurance = '', specialty = '', language = '', acceptingOnly, sort = 'relevance', lat, lng, radiusKm } = req.query
  const userLat = lat !== undefined ? parseFloat(lat) : null
  const userLng = lng !== undefined ? parseFloat(lng) : null
  const hasLocation = userLat !== null && userLng !== null && !Number.isNaN(userLat) && !Number.isNaN(userLng)
  const radius = radiusKm !== undefined ? parseFloat(radiusKm) : null

  const { rows } = await pool.query('SELECT * FROM doctors WHERE verification_status = $1', [PUBLICLY_VISIBLE_STATUS])
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

  if (language) {
    const lang = String(language).trim().toLowerCase()
    filtered = filtered.filter((d) => (d.languages || []).some((l) => l.toLowerCase() === lang))
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
  const { bio, address, city, lat, lng, acceptingNew, acceptsCash, insurances, languages } = req.body

  await pool.query(
    `UPDATE doctors SET bio = COALESCE($1, bio), address = COALESCE($2, address), city = COALESCE($3, city),
       lat = COALESCE($4, lat), lng = COALESCE($5, lng),
       accepting_new = COALESCE($6, accepting_new), accepts_cash = COALESCE($7, accepts_cash),
       languages = COALESCE($8, languages) WHERE id = $9`,
    [
      bio ?? null,
      address ?? null,
      city ?? null,
      typeof lat === 'number' ? lat : null,
      typeof lng === 'number' ? lng : null,
      acceptingNew === undefined ? null : !!acceptingNew,
      acceptsCash === undefined ? null : !!acceptsCash,
      Array.isArray(languages) && languages.length > 0 ? JSON.stringify(languages) : null,
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

// Must be registered before GET /doctors/:id below — otherwise Express
// matches this path as :id="verify-email" and the real handler is never
// reached (this is exactly what made every verification link appear
// "invalid or expired" regardless of the token).
router.get('/doctors/verify-email', async (req, res) => {
  const token = String(req.query.token || '')
  const { rows } = await pool.query(
    'SELECT doctor_id, expires_at, used_at FROM action_tokens WHERE token = $1 AND purpose = $2',
    [token, 'verify_email'],
  )
  const row = rows[0]
  if (!row) return res.status(400).json({ error: 'This verification link is invalid or has expired.' })

  const { rows: doctorRows } = await pool.query('SELECT email_verified FROM doctors WHERE id = $1', [row.doctor_id])
  if (row.used_at || doctorRows[0]?.email_verified) {
    // Already consumed — commonly by an email client's link-safety scanner
    // opening it before the person does. Verifying is idempotent, so a
    // repeat visit is still a success rather than "invalid or expired".
    return res.json({ ok: true })
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired.' })
  }
  await pool.query('UPDATE action_tokens SET used_at = now() WHERE token = $1', [token])
  await pool.query('UPDATE doctors SET email_verified = TRUE WHERE id = $1', [row.doctor_id])
  res.json({ ok: true })
})

router.get('/doctors/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.params.id])
  const doctor = rows[0]
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  if (doctor.verification_status !== PUBLICLY_VISIBLE_STATUS) {
    // Not publicly bookable — only the doctor themself (previewing their own
    // pending/rejected/suspended profile) or an admin may see it. Everyone
    // else gets exactly the same 404 as a nonexistent profile, so a rejected
    // doctor's profile URL doesn't leak that it ever existed.
    const [ownerId, admin] = await Promise.all([
      optionalDoctorId(req),
      getAdminForToken(req.cookies?.[ADMIN_COOKIE_NAME]),
    ])
    if (ownerId !== doctor.id && !admin) {
      return res.status(404).json({ error: 'Doctor not found' })
    }
    return res.json(await serializeDoctor(doctor, { includePrivate: ownerId === doctor.id || !!admin }))
  }

  res.json(await serializeDoctor(doctor))
})

router.post('/doctors/register', authLimiter, validateBody(doctorRegisterSchema), async (req, res) => {
  const { name, credentials, specialty, email, password, hpcsaNumber, address, city, lat, lng, bio, insurances, acceptsCash } = req.body

  const { rows: existingRows } = await pool.query('SELECT id FROM doctors WHERE email = $1', [email])
  if (existingRows[0]) return res.status(409).json({ error: 'An account with this email already exists' })

  const { rows: hpcsaRows } = await pool.query(
    'SELECT id FROM doctors WHERE LOWER(TRIM(hpcsa_number)) = LOWER(TRIM($1))',
    [hpcsaNumber],
  )
  if (hpcsaRows[0]) {
    return res.status(409).json({ error: 'An account is already registered with this HPCSA number' })
  }

  const insuranceSelections = Array.isArray(insurances) ? insurances : []
  const wantsCash = acceptsCash !== undefined ? !!acceptsCash : insuranceSelections.includes(CASH_OPTION)

  const id = crypto.randomUUID()
  try {
    await pool.query(
      `INSERT INTO doctors
        (id, name, credentials, specialty, email, password_hash, photo, address, city, lat, lng, bio, education, languages, accepting_new, accepts_cash, rating, review_count, hpcsa_number, verification_status, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, TRUE, $15, 5.0, 0, $16, 'pending', FALSE)`,
      [
        id,
        name,
        credentials || 'MD',
        specialty,
        email,
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
        hpcsaNumber,
      ],
    )
  } catch (err) {
    // Belt-and-braces: the DB-level unique index (server/migrations/0002_*)
    // is the real guard against a race between the check above and this
    // insert; translate its violation into the same friendly error.
    if (err.code === '23505' && err.constraint === 'doctors_hpcsa_number_unique_idx') {
      return res.status(409).json({ error: 'An account is already registered with this HPCSA number' })
    }
    throw err
  }

  for (const ins of insuranceSelections) {
    if (ins === CASH_OPTION) continue
    await pool.query('INSERT INTO doctor_insurances (doctor_id, insurance) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, ins])
  }

  const verifyToken = await createActionToken(id, 'verify_email')
  const { subject, html } = verifyEmailMessage({ name, verifyUrl: `${appUrl()}/verify-email?token=${verifyToken}` })
  await sendEmail({ to: email, subject, html })

  const token = await createSession(id)
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [id])
  res.status(201).json({ token, doctor: await serializeDoctor(rows[0], { includePrivate: true }) })
})

router.post('/doctors/login', authLimiter, validateBody(doctorLoginSchema), async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query('SELECT * FROM doctors WHERE email = $1', [email])
  const row = rows[0]
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const token = await createSession(row.id)
  res.json({ token, doctor: await serializeDoctor(row, { includePrivate: true }) })
})

// Changes the password for the currently-authenticated doctor (requires the
// current password) and immediately revokes every other active session —
// a stolen session token can't survive the owner securing their account.
router.post('/doctors/me/password', requireAuth, authLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const check = passwordSchema.safeParse(newPassword)
  if (!check.success) return res.status(400).json({ error: check.error.issues[0]?.message || 'Invalid password' })

  const { rows } = await pool.query('SELECT password_hash FROM doctors WHERE id = $1', [req.doctorId])
  if (!rows[0] || !verifyPassword(currentPassword || '', rows[0].password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  await pool.query('UPDATE doctors SET password_hash = $1 WHERE id = $2', [hashPassword(check.data), req.doctorId])
  await revokeAllDoctorSessions(req.doctorId, req.doctorToken)
  res.json({ ok: true })
})

// "Log out everywhere": revokes every session for this account except the
// one making the request.
router.post('/doctors/me/sessions/revoke-all', requireAuth, async (req, res) => {
  await revokeAllDoctorSessions(req.doctorId, req.doctorToken)
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
  const check = passwordSchema.safeParse(password)
  if (!check.success) return res.status(400).json({ error: check.error.issues[0]?.message || 'Invalid password' })
  const doctorId = await consumeActionToken(String(token || ''), 'reset_password')
  if (!doctorId) return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
  await pool.query('UPDATE doctors SET password_hash = $1 WHERE id = $2', [hashPassword(check.data), doctorId])
  // A password reset means the previous password may have been compromised
  // — cut every existing session rather than leaving old ones valid.
  await revokeAllDoctorSessions(doctorId)
  res.json({ ok: true })
})

export default router
