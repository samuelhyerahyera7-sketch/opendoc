import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarCheck2, CheckCircle2, MapPin } from 'lucide-react'
import { api, ApiError, type ApiDoctor } from '../api/client'
import { usePatientAuth } from '../context/PatientAuthContext'

export default function Booking() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const slotId = params.get('slotId')
  const day = params.get('day') ?? ''
  const time = params.get('time') ?? ''

  const { token: patientToken, patient } = usePatientAuth()
  const [doctor, setDoctor] = useState<ApiDoctor | null>(null)
  const [confirmedAppointment, setConfirmedAppointment] = useState<{ emailSent: boolean; reviewToken: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', reason: '', newPatient: true })

  useEffect(() => {
    if (!id) return
    api.getDoctor(id).catch(() => null).then((d) => setDoctor(d))
  }, [id])

  useEffect(() => {
    if (!patient) return
    setForm((f) => ({ ...f, firstName: patient.firstName, lastName: patient.lastName, email: patient.email, phone: patient.phone || f.phone }))
  }, [patient])

  useEffect(() => {
    if (!id || !slotId) navigate('/search', { replace: true })
  }, [id, slotId, navigate])

  if (!id || !slotId) return null

  if (!doctor) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading…</div>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const appointment = await api.bookAppointment(
        {
          doctorId: id!,
          slotId: Number(slotId),
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          reason: form.reason,
          newPatient: form.newPatient,
        },
        patientToken ?? undefined,
      )
      setConfirmedAppointment({ emailSent: appointment.emailSent, reviewToken: appointment.review_token })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmedAppointment) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-50">
          <CheckCircle2 size={34} className="text-brand-500" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-ink-900">Appointment confirmed!</h1>
        <p className="mt-2 text-ink-600">
          You're booked with <span className="font-semibold">{doctor.name}, {doctor.credentials}</span> on{' '}
          <span className="font-semibold">{day}</span> at <span className="font-semibold">{time}</span>.
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {confirmedAppointment.emailSent
            ? `A confirmation was sent to ${form.email}.`
            : 'Save these details — email confirmations are not enabled on this deployment yet.'}
        </p>
        <Link
          to={`/review/${confirmedAppointment.reviewToken}`}
          className="mt-3 text-sm font-medium text-brand-600 underline decoration-brand-300 underline-offset-4"
        >
          Bookmark this link to leave a review after your visit
        </Link>
        <div className="mt-8 flex gap-3">
          <Link to="/" className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Back to home
          </Link>
          <Link to="/search" className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Find more care
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ink-50/60 flex-1">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to={`/doctor/${doctor.id}`} className="text-sm font-medium text-brand-600 hover:underline">
          &larr; Back to profile
        </Link>

        {!patient && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
            <span>Log in to track this booking and get updates in one place.</span>
            <Link to="/patient/login" className="font-semibold text-brand-600 hover:underline">Log in</Link>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <img src={doctor.photo} alt={doctor.name} className="h-16 w-16 rounded-xl object-cover" />
            <div>
              <p className="font-bold text-ink-900">{doctor.name}, {doctor.credentials}</p>
              <p className="text-sm text-brand-600">{doctor.specialty}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} /> {doctor.address}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
            <CalendarCheck2 size={16} />
            {day} at {time}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="text-lg font-bold text-ink-900">Your information</h2>

          {error && (
            <div className="mt-4 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">First name</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Last name</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Phone</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Reason for visit</label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                placeholder="e.g. Annual checkup, skin concern..."
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.newPatient}
              onChange={(e) => setForm({ ...form, newPatient: e.target.checked })}
              className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
            />
            I am a new patient
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            {submitting ? 'Confirming…' : 'Confirm appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}
