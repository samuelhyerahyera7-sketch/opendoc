import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  CalendarPlus,
  FileUp,
  Inbox,
  LogOut,
  Mail,
  Send,
  Trash2,
  Download,
  CalendarDays,
} from 'lucide-react'
import { useDoctorAuth } from '../../context/DoctorAuthContext'
import { api, ApiError, type Appointment, type DirectoryDoctor, type PatientFile, type ReceivedFile } from '../../api/client'
import VerificationBadge from '../../components/VerificationBadge'
import NotificationBell from '../../components/NotificationBell'

type Tab = 'appointments' | 'schedule' | 'files'

const DAY_OPTIONS = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat', 'Mon']

export default function ProviderDashboard() {
  const { token, doctor, loading, logout, refresh } = useDoctorAuth()
  const [tab, setTab] = useState<Tab>('appointments')

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading dashboard…</div>
  }

  if (!token || !doctor) {
    return <Navigate to="/provider/login" replace />
  }

  return (
    <div className="bg-ink-50/60 flex-1">
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <img src={doctor.photo} alt={doctor.name} className="h-14 w-14 rounded-xl object-cover" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-ink-900">{doctor.name}, {doctor.credentials}</h1>
                <VerificationBadge status={doctor.verificationStatus} />
              </div>
              <p className="text-sm text-brand-600">{doctor.specialty} &middot; {doctor.city || 'No city set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell token={token} />
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              <LogOut size={15} /> Log out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {doctor.verificationStatus === 'pending' && (
          <div className="mb-6 rounded-xl bg-ink-100 px-4 py-3 text-sm text-ink-700">
            Your listing is live, but marked "verification pending" until an OpenDoc reviewer confirms your HPCSA number.
          </div>
        )}
        {token && !doctor.emailVerified && <EmailVerificationBanner token={token} />}

        <div className="mb-6 flex gap-2 overflow-x-auto">
          <TabButton active={tab === 'appointments'} onClick={() => setTab('appointments')} icon={CalendarDays}>
            Appointments
          </TabButton>
          <TabButton active={tab === 'schedule'} onClick={() => setTab('schedule')} icon={CalendarPlus}>
            Schedule
          </TabButton>
          <TabButton active={tab === 'files'} onClick={() => setTab('files')} icon={Send}>
            Patient Files
          </TabButton>
        </div>

        {tab === 'appointments' && <AppointmentsPanel token={token} />}
        {tab === 'schedule' && <SchedulePanel token={token} onSlotsChanged={refresh} />}
        {tab === 'files' && <FilesPanel token={token} />}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof CalendarDays
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-brand-500 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  )
}

function AppointmentsPanel({ token }: { token: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  function reload() {
    api.getMyAppointments(token).then(setAppointments).finally(() => setLoading(false))
  }

  useEffect(reload, [token])

  if (loading) return <p className="text-ink-400">Loading appointments…</p>

  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
        <p className="text-lg font-semibold text-ink-800">No appointments yet</p>
        <p className="mt-1 text-sm text-ink-500">Once patients book with you, they'll show up here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {appointments.map((a) => (
        <DoctorAppointmentRow key={a.id} appointment={a} token={token} onChanged={reload} />
      ))}
    </div>
  )
}

function DoctorAppointmentRow({
  appointment,
  token,
  onChanged,
}: {
  appointment: Appointment
  token: string
  onChanged: () => void
}) {
  const [showReschedule, setShowReschedule] = useState(false)
  const [openSlots, setOpenSlots] = useState<{ id: number; day: string; time: string }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isCancelled = appointment.status === 'cancelled'

  async function handleCancel() {
    if (!window.confirm(`Cancel the appointment with ${appointment.patient_first_name} ${appointment.patient_last_name}?`)) return
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
    if (!openSlots) {
      const profile = await api.getMyProfile(token).catch(() => null)
      setOpenSlots(profile?.slots ?? [])
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink-900">{appointment.patient_first_name} {appointment.patient_last_name}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCancelled ? 'bg-ink-100 text-ink-500' : 'bg-brand-50 text-brand-700'}`}>
          {isCancelled ? 'Cancelled' : `${appointment.day_label} at ${appointment.time_label}`}
        </span>
      </div>
      <div className="mt-2 grid gap-1 text-sm text-ink-500 sm:grid-cols-2">
        <p>{appointment.patient_email}</p>
        <p>{appointment.patient_phone}</p>
      </div>
      {appointment.reason && <p className="mt-2 text-sm text-ink-600">Reason: {appointment.reason}</p>}
      {!!appointment.new_patient && <p className="mt-1 text-xs font-medium text-accent-600">New patient</p>}

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
          {!openSlots ? (
            <p className="text-xs text-ink-400">Loading your open time slots…</p>
          ) : openSlots.length === 0 ? (
            <p className="text-xs text-ink-500">You have no other open time slots. Add one in the Schedule tab first.</p>
          ) : (
            <select
              defaultValue=""
              disabled={busy}
              onChange={(e) => e.target.value && handleReschedule(Number(e.target.value))}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="" disabled>Move to a new time…</option>
              {openSlots.map((s) => (
                <option key={s.id} value={s.id}>{s.day} at {s.time}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}

function SchedulePanel({ token, onSlotsChanged }: { token: string; onSlotsChanged: () => void }) {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.getMyProfile>> | null>(null)
  const [day, setDay] = useState(DAY_OPTIONS[0])
  const [time, setTime] = useState('09:00 AM')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function loadProfile() {
    api.getMyProfile(token).then(setProfile)
  }

  useEffect(loadProfile, [token])

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await api.addSlot(token, day, time)
      loadProfile()
      onSlotsChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that time slot.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveSlot(id: number) {
    try {
      await api.deleteSlot(token, id)
      loadProfile()
      onSlotsChanged()
    } catch {
      setError('Could not remove that slot — it may already be booked.')
    }
  }

  if (!profile) return <p className="text-ink-400">Loading schedule…</p>

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <h2 className="text-lg font-bold text-ink-900">Open time slots</h2>
        <p className="mt-1 text-sm text-ink-500">Patients can book any open slot below. Booked slots disappear automatically.</p>

        {profile.slots.length === 0 ? (
          <p className="mt-6 text-sm text-ink-500">You have no open slots. Add one to start accepting bookings.</p>
        ) : (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {profile.slots.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{s.day} &middot; {s.time}</span>
                <button onClick={() => handleRemoveSlot(s.id)} className="text-ink-400 hover:text-accent-600">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-fit rounded-2xl border border-ink-100 bg-white p-6">
        <h3 className="flex items-center gap-2 font-bold text-ink-900">
          <CalendarPlus size={17} className="text-brand-500" /> Add a time slot
        </h3>
        {error && <div className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-700">{error}</div>}
        <form onSubmit={handleAddSlot} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600">Day</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600">Time</label>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 2:30 PM"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add slot'}
          </button>
        </form>
      </div>
    </div>
  )
}

function FilesPanel({ token }: { token: string }) {
  const [myFiles, setMyFiles] = useState<PatientFile[]>([])
  const [received, setReceived] = useState<ReceivedFile[]>([])
  const [subTab, setSubTab] = useState<'upload' | 'received'>('upload')

  function reload() {
    api.getMyFiles(token).then(setMyFiles)
    api.getReceivedFiles(token).then(setReceived)
  }

  useEffect(reload, [token])

  async function handleDownload(fileId: string, name: string) {
    const res = await fetch(api.downloadFileUrl(fileId), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setSubTab('upload')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${subTab === 'upload' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200'}`}
        >
          <FileUp size={14} className="mr-1.5 inline" /> My uploads & transfers
        </button>
        <button
          onClick={() => setSubTab('received')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${subTab === 'received' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200'}`}
        >
          <Inbox size={14} className="mr-1.5 inline" /> Received from other doctors ({received.length})
        </button>
      </div>

      {subTab === 'upload' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="text-lg font-bold text-ink-900">Your patient files</h2>
            {myFiles.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">You haven't uploaded any patient files yet.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-ink-100">
                {myFiles.map((f) => (
                  <FileRow key={f.id} file={f} token={token} onTransferred={reload} onDownload={handleDownload} />
                ))}
              </div>
            )}
          </div>
          <UploadForm token={token} onUploaded={reload} />
        </div>
      )}

      {subTab === 'received' && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="text-lg font-bold text-ink-900">Files transferred to you</h2>
          {received.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No other doctor has transferred you a patient file yet.</p>
          ) : (
            <div className="mt-4 flex flex-col divide-y divide-ink-100">
              {received.map((f) => (
                <div key={f.transfer_id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-ink-900">{f.patient_first_name} {f.patient_last_name}</p>
                    <p className="text-sm text-ink-500">{f.original_name} &middot; from {f.from_doctor_name} ({f.from_doctor_specialty})</p>
                    {f.message && <p className="mt-1 text-sm italic text-ink-500">"{f.message}"</p>}
                  </div>
                  <button
                    onClick={() => handleDownload(f.id, f.original_name)}
                    className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
                  >
                    <Download size={13} /> Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UploadForm({ token, onUploaded }: { token: string; onUploaded: () => void }) {
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please choose a file to upload.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('patientFirstName', patientFirstName)
      formData.append('patientLastName', patientLastName)
      formData.append('patientEmail', patientEmail)
      formData.append('note', note)
      await api.uploadFile(token, formData)
      setPatientFirstName('')
      setPatientLastName('')
      setPatientEmail('')
      setNote('')
      setFile(null)
      onUploaded()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="h-fit rounded-2xl border border-ink-100 bg-white p-6">
      <h3 className="flex items-center gap-2 font-bold text-ink-900">
        <FileUp size={17} className="text-brand-500" /> Upload a patient file
      </h3>
      {error && <div className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-700">{error}</div>}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Patient first name"
            value={patientFirstName}
            onChange={(e) => setPatientFirstName(e.target.value)}
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <input
            required
            placeholder="Patient last name"
            value={patientLastName}
            onChange={(e) => setPatientLastName(e.target.value)}
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <input
          type="email"
          placeholder="Patient email (optional)"
          value={patientEmail}
          onChange={(e) => setPatientEmail(e.target.value)}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <textarea
          rows={2}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <input
          required
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-ink-600 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
        />
        <button
          type="submit"
          disabled={uploading}
          className="mt-1 rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : 'Upload file'}
        </button>
      </form>
    </div>
  )
}

function FileRow({
  file,
  token,
  onTransferred,
  onDownload,
}: {
  file: PatientFile
  token: string
  onTransferred: () => void
  onDownload: (id: string, name: string) => void
}) {
  const [showTransfer, setShowTransfer] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DirectoryDoctor[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const handle = setTimeout(() => {
      api.searchDirectory(token, query).then(setResults).catch(() => {})
    }, 250)
    return () => clearTimeout(handle)
  }, [query, token])

  async function handleTransfer(toDoctor: DirectoryDoctor) {
    setError(null)
    setSending(true)
    try {
      await api.transferFile(token, file.id, toDoctor.id, message)
      setSentTo(toDoctor.name)
      setShowTransfer(false)
      setQuery('')
      setResults([])
      setMessage('')
      onTransferred()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Transfer failed. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">{file.patient_first_name} {file.patient_last_name}</p>
          <p className="text-sm text-ink-500">{file.original_name} {file.note && `· ${file.note}`}</p>
          {sentTo && <p className="mt-1 text-xs font-medium text-brand-600">Transferred to {sentTo}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onDownload(file.id, file.original_name)}
            className="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Download size={13} /> Download
          </button>
          <button
            onClick={() => setShowTransfer((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            <Send size={13} /> Transfer to doctor
          </button>
        </div>
      </div>

      {showTransfer && (
        <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
          {error && <p className="mb-2 text-xs text-accent-700">{error}</p>}
          <input
            autoFocus
            placeholder="Search doctor by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <textarea
            rows={2}
            placeholder="Optional note for the receiving doctor"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          {results.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {results.map((d) => (
                <button
                  key={d.id}
                  disabled={sending}
                  onClick={() => handleTransfer(d)}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-brand-50 disabled:opacity-60"
                >
                  <img src={d.photo} alt={d.name} className="h-7 w-7 rounded-full object-cover" />
                  <span>
                    <span className="font-semibold text-ink-900">{d.name}, {d.credentials}</span>{' '}
                    <span className="text-ink-500">— {d.specialty}</span>
                  </span>
                </button>
              ))}
            </div>
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
      await api.resendVerification(token)
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
