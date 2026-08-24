import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api, ApiError, type Specialty } from '../../api/client'
import { useDoctorAuth } from '../../context/DoctorAuthContext'

export default function ProviderSignup() {
  const navigate = useNavigate()
  const { register } = useDoctorAuth()
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [medicalAids, setMedicalAids] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    credentials: 'MD',
    specialty: '',
    email: '',
    password: '',
    address: '',
    city: '',
    bio: '',
  })
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([])
  const [acceptsCash, setAcceptsCash] = useState(true)

  useEffect(() => {
    api.getSpecialties().then(setSpecialties).catch(() => {})
    api.getMedicalAids().then(setMedicalAids).catch(() => {})
  }, [])

  function toggleInsurance(ins: string) {
    setSelectedInsurances((prev) => (prev.includes(ins) ? prev.filter((i) => i !== ins) : [...prev, ins]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({ ...form, insurances: selectedInsurances, acceptsCash })
      navigate('/provider/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-ink-50/60 px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white">
            <Search size={20} strokeWidth={2.5} />
          </span>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-ink-900">List your practice</h1>
        <p className="mt-1 text-center text-sm text-ink-500">
          Create a provider account to appear in search, manage your schedule, and receive patient files.
        </p>

        {error && <div className="mt-5 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Full name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                placeholder="Dr. Jamie Rivera"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Credentials</label>
              <input
                value={form.credentials}
                onChange={(e) => setForm({ ...form, credentials: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                placeholder="MD, DDS, DPT..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Specialty</label>
            <select
              required
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            >
              <option value="" disabled>Select a specialty</option>
              {specialties.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Password</label>
              <input
                required
                minLength={8}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Practice address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="Tell patients about your approach to care..."
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                checked={acceptsCash}
                onChange={(e) => setAcceptsCash(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
              />
              I accept cash-paying (self-pay) patients without medical aid
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Medical aid schemes you accept</label>
            <p className="mb-2 text-xs text-ink-400">Select every scheme your practice bills directly.</p>
            <div className="flex flex-wrap gap-2">
              {medicalAids.map((ins) => (
                <button
                  type="button"
                  key={ins}
                  onClick={() => toggleInsurance(ins)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    selectedInsurances.includes(ins)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-ink-200 text-ink-600 hover:border-brand-300'
                  }`}
                >
                  {ins}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create provider account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have a provider account?{' '}
          <Link to="/provider/login" className="font-semibold text-brand-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
