import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { CalendarDays, LogOut, MapPin } from 'lucide-react'
import { usePatientAuth } from '../../context/PatientAuthContext'
import { api, type PatientAppointment } from '../../api/client'
import NotificationBell from '../../components/NotificationBell'

export default function PatientDashboard() {
  const { token, patient, loading, logout } = usePatientAuth()
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)

  useEffect(() => {
    if (!token) return
    api.getMyPatientAppointments(token).then(setAppointments).finally(() => setLoadingAppointments(false))
  }, [token])

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
              <div key={a.id} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5">
                <img src={a.doctor_photo} alt={a.doctor_name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-bold text-ink-900">{a.doctor_name}, {a.doctor_credentials}</p>
                  <p className="text-sm text-brand-600">{a.doctor_specialty}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} /> {a.doctor_address}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {a.day_label} at {a.time_label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
