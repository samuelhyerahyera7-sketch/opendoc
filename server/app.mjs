import express from 'express'
import cors from 'cors'
import { initSchema } from './db.mjs'
import { seedIfEmpty } from './seed.mjs'
import doctorsRouter from './routes/doctors.mjs'
import appointmentsRouter from './routes/appointments.mjs'
import filesRouter from './routes/files.mjs'
import adminRouter from './routes/admin.mjs'
import notificationsRouter from './routes/notifications.mjs'
import patientsRouter from './routes/patients.mjs'
import sitemapRouter from './routes/sitemap.mjs'
import { localUploadsDir } from './storage.mjs'

// Schema creation always runs once per instance (memoized). Demo data
// seeding is opt-in via SEED_DEMO_DATA=true — meant for local dev only, so
// a real deployment starts with an empty, real doctor directory instead of
// silently repopulating itself with fake demo doctors.
let readyPromise
function ready() {
  if (!readyPromise) {
    readyPromise = initSchema().then(() => {
      if (process.env.SEED_DEMO_DATA === 'true') return seedIfEmpty()
    })
  }
  return readyPromise
}

const app = express()
app.use(cors())
app.use(express.json())

app.use(async (req, res, next) => {
  try {
    await ready()
    next()
  } catch (err) {
    next(err)
  }
})

app.use('/api', doctorsRouter)
app.use('/api', appointmentsRouter)
app.use('/api', filesRouter)
app.use('/api', adminRouter)
app.use('/api', notificationsRouter)
app.use('/api', patientsRouter)
app.use(sitemapRouter)

// Local-dev-only fallback for publicly-viewable uploads (doctor profile
// photos) when no Blob store is configured. In production Blob URLs are
// used directly and this route is never hit.
app.use('/api/uploads', express.static(localUploadsDir))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
