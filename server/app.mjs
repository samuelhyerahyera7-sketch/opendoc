import express from 'express'
import cors from 'cors'
import { initSchema } from './db.mjs'
import { seedIfEmpty } from './seed.mjs'
import doctorsRouter from './routes/doctors.mjs'
import appointmentsRouter from './routes/appointments.mjs'
import filesRouter from './routes/files.mjs'
import adminRouter from './routes/admin.mjs'

// Schema creation + demo seeding only need to happen once per running
// instance. In serverless, that's once per cold start (memoized here);
// locally it just runs once at startup.
let readyPromise
function ready() {
  if (!readyPromise) {
    readyPromise = initSchema().then(() => seedIfEmpty())
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

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
