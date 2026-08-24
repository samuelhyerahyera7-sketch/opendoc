import express from 'express'
import cors from 'cors'
import { seedIfEmpty } from './seed.mjs'
import doctorsRouter from './routes/doctors.mjs'
import appointmentsRouter from './routes/appointments.mjs'
import filesRouter from './routes/files.mjs'

seedIfEmpty()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', doctorsRouter)
app.use('/api', appointmentsRouter)
app.use('/api', filesRouter)

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 5175
app.listen(PORT, () => {
  console.log(`OpenDoc API listening on http://localhost:${PORT}`)
})
