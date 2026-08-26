import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { runMigrations } from './migrate.mjs'
import { seedIfEmpty } from './seed.mjs'
import doctorsRouter from './routes/doctors.mjs'
import appointmentsRouter from './routes/appointments.mjs'
import filesRouter from './routes/files.mjs'
import adminRouter from './routes/admin.mjs'
import adminAuthRouter from './routes/adminAuth.mjs'
import notificationsRouter from './routes/notifications.mjs'
import patientsRouter from './routes/patients.mjs'
import sitemapRouter from './routes/sitemap.mjs'
import { localUploadsDir } from './storage.mjs'

// Schema migrations always run once per instance (memoized) before any
// request is served — see server/migrations/ and README.md. Demo data
// seeding is opt-in via SEED_DEMO_DATA=true — meant for local dev only, so
// a real deployment starts with an empty, real doctor directory instead of
// silently repopulating itself with fake demo doctors. NEVER set this in
// production — see .env.example.
let readyPromise
function ready() {
  if (!readyPromise) {
    readyPromise = runMigrations().then(() => {
      if (process.env.SEED_DEMO_DATA === 'true') return seedIfEmpty()
    })
  }
  return readyPromise
}

// Frontend and API are always served from the same origin (Vercel rewrites
// /api/* to the same deployment; the Vite dev server proxies /api to the
// local backend) — so cross-origin requests to these APIs are never
// legitimate browser traffic. CORS_ORIGIN can list additional trusted
// origins (comma-separated) if that ever changes.
const allowedOrigins = new Set(
  [process.env.APP_URL, ...(process.env.CORS_ORIGIN || '').split(',')].map((o) => o?.trim()).filter(Boolean),
)

const app = express()
app.set('trust proxy', 1)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https://api.mapbox.com', 'https://events.mapbox.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'script-src': ["'self'"],
        'worker-src': ["'self'", 'blob:'],
        'frame-ancestors': ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (server-to-server, curl, health checks) — allow.
      if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) return callback(null, true)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

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
app.use('/api', adminAuthRouter)
app.use('/api', adminRouter)
app.use('/api', notificationsRouter)
app.use('/api', patientsRouter)
app.use(sitemapRouter)

// Local-dev-only fallback for publicly-viewable uploads (doctor profile
// photos) when no Blob store is configured. In production Blob URLs are
// used directly and this route is never hit.
app.use('/api/uploads', express.static(localUploadsDir))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Never leak stack traces or raw error messages (which can include SQL/DB
// detail) to the client — log full detail server-side, return a generic
// message to the caller.
app.use((err, req, res, next) => {
  console.error(err)
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({ error: 'Internal server error' })
})

export default app
