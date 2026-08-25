import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { CalendarDays, LogOut, Mail, MapPin } from 'lucide-react'
import { usePatientAuth } from '../../context/PatientAuthContext'
import { api, ApiError, type ApiDoctor, type PatientAppointment } from '../../api/client'
import NotificationBell from '../../components/NotificationBell'

export default function PatientDashboard() {
  const { token, patient, loading, logout } = usePatientAuth()
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)

  function reloadAppointments() {
    if (!token) return
    api.getMyPatientAppointments(token).then(setAppointments).finally(() => setLoadingAppointments(false))
  }

  useEffect(reloadAppointments, [token])

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading…</div>
  }

  if (!token || !patient) {
    return <Navigate to="/patient/login" replace />
  }

  return (
    <div className="bg-ink-50/60 flex-1">
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold text-ink-900">Hi, {patient.firstName}</h1>
            <p className="text-sm text-ink-500">{patient.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell token={token} variant="patient" />
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              <LogOut size={15} /> Log out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {!patient.emailVerified && <EmailVerificationBanner token={token} />}

        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
          <CalendarDays size={18} className="text-brand-500" /> Your appointments
        </h2>

        {loadingAppointments ? (
          <p className="text-ink-400">Loading appointments…</p>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-ink-800">No appointments yet</p>
            <p className="mt-1 text-sm text-ink-500">Bookings you make while logged in will show up here.</p>
            <Link to="/search" className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              Find a doctor
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((a) => (
              <AppointmentRow key={a.id} appointment={a} token={token} onChanged={reloadAppointments} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AppointmentRow({
  appointment,
  token,
  onChanged,
}: {
  appointment: PatientAppointment
  token: string
  onChanged: () => void
}) {
  const [showReschedule, setShowReschedule] = useState(false)
  const [doctor, setDoctor] = useState<ApiDoctor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isCancelled = appointment.status === 'cancelled'

  async function handleCancel() {
    if (!window.confirm('Cancel this appointment?')) return
    setBusy(true)
    setError(null)
    try {
      await api.cancelAppointment(token, appointment.id)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this appointment.')
    } finally {
      setBusy(false)
    }
  }

  async function openReschedule() {
    setShowReschedule((v) => !v)
    if (!doctor) {
      const d = await api.getDoctor(appointment.doctor_id).catch(() => null)
      setDoctor(d)
    }
  }

  async function handleReschedule(slotId: number) {
    setBusy(true)
    setError(null)
    try {
      await api.rescheduleAppointment(token, appointment.id, slotId)
      setShowReschedule(false)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not move this appointment to that time.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`rounded-2xl border bg-white p-5 ${isCancelled ? 'border-ink-100 opacity-60' : 'border-ink-100'}`}>
      <div className="flex items-center gap-4">
        <img src={appointment.doctor_photo} alt={appointment.doctor_name} className="h-14 w-14 rounded-xl object-cover" />
        <div className="flex-1">
          <p className="font-bold text-ink-900">{appointment.doctor_name}, {appointment.doctor_credentials}</p>
          <p className="text-sm text-brand-600">{appointment.doctor_specialty}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} /> {appointment.doctor_address}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCancelled ? 'bg-ink-100 text-ink-500' : 'bg-brand-50 text-brand-700'}`}>
          {isCancelled ? 'Cancelled' : `${appointment.day_label} at ${appointment.time_label}`}
        </span>
      </div>

      {error && <p className="mt-3 text-xs text-accent-700">{error}</p>}

      {!isCancelled && (
        <div className="mt-4 flex gap-2 border-t border-ink-50 pt-3">
          <button
            onClick={openReschedule}
            disabled={busy}
            className="rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
          >
            Reschedule
          </button>
          <button
            onClick={handleCancel}
            disabled={busy}
            className="rounded-full border border-accent-200 px-4 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      )}

      {showReschedule && (
        <div className="mt-3 rounded-xl bg-ink-50 p-4">
          {!doctor ? (
            <p className="text-xs text-ink-400">Loading available times…</p>
          ) : doctor.slots.length === 0 ? (
            <p className="text-xs text-ink-500">No other open time slots right now.</p>
          ) : (
            <select
              defaultValue=""
              disabled={busy}
              onChange={(e) => e.target.value && handleReschedule(Number(e.target.value))}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="" disabled>Pick a new time…</option>
              {doctor.slots.map((s) => (
                <option key={s.id} value={s.id}>{s.day} at {s.time}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}

function EmailVerificationBanner({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function resend() {
    setStatus('sending')
    try {
      await api.resendPatientVerification(token)
      setStatus('sent')
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
      <span className="flex items-center gap-2">
        <Mail size={15} /> Please verify your email address.
      </span>
      {status === 'sent' ? (
        <span className="font-semibold">Verification email sent — check your inbox.</span>
      ) : (
        <button onClick={resend} disabled={status === 'sending'} className="font-semibold underline disabled:opacity-60">
          {status === 'sending' ? 'Sending…' : 'Resend verification email'}
        </button>
      )}
    </div>
  )
}
