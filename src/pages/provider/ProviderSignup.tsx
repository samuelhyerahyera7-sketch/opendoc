import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api, ApiError, type Specialty } from '../../api/client'
import { useDoctorAuth } from '../../context/DoctorAuthContext'
import MedicalAidLogo from '../../components/MedicalAidBadge'
import LocationAutocomplete from '../../components/LocationAutocomplete'
import PasswordInput from '../../components/PasswordInput'
import { findLocationByName } from '../../data/saLocations'

export default function ProviderSignup() {
  const navigate = useNavigate()
  const { token, doctor, loading, register } = useDoctorAuth()
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
    hpcsaNumber: '',
    address: '',
    city: '',
    bio: '',
  })
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([])
  const [customInsurances, setCustomInsurances] = useState<string[]>([])
  const [customInsuranceInput, setCustomInsuranceInput] = useState('')
  const [showCustomInsuranceInput, setShowCustomInsuranceInput] = useState(false)
  const [acceptsCash, setAcceptsCash] = useState(true)
  const [cityCoords, setCityCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [otherSpecialty, setOtherSpecialty] = useState('')
  const [agreed, setAgreed] = useState(false)

  const OTHER_SPECIALTY = '__other__'

  useEffect(() => {
    api.getSpecialties().then(setSpecialties).catch(() => {})
    api.getMedicalAids().then(setMedicalAids).catch(() => {})
  }, [])

  function toggleInsurance(ins: string) {
    setSelectedInsurances((prev) => (prev.includes(ins) ? prev.filter((i) => i !== ins) : [...prev, ins]))
  }

  function addCustomInsurance() {
    const name = customInsuranceInput.trim()
    if (!name || customInsurances.includes(name) || medicalAids.includes(name)) return
    setCustomInsurances((prev) => [...prev, name])
    setSelectedInsurances((prev) => [...prev, name])
    setCustomInsuranceInput('')
  }

  function removeCustomInsurance(name: string) {
    setCustomInsurances((prev) => prev.filter((i) => i !== name))
    setSelectedInsurances((prev) => prev.filter((i) => i !== name))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.specialty === OTHER_SPECIALTY && !otherSpecialty.trim()) {
      setError('Please tell us your specialty.')
      return
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    setSubmitting(true)
    try {
      const area = addressCoords ?? cityCoords ?? findLocationByName(form.city)
      const specialty = form.specialty === OTHER_SPECIALTY ? otherSpecialty.trim() : form.specialty
      await register({
        ...form,
        specialty,
        lat: area?.lat,
        lng: area?.lng,
        insurances: selectedInsurances,
        acceptsCash,
      })
      navigate('/provider/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!loading && token && doctor) {
    return <Navigate to="/provider/dashboard" replace />
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
              <option value={OTHER_SPECIALTY}>Other (please specify)</option>
            </select>
            {form.specialty === OTHER_SPECIALTY && (
              <input
                required
                value={otherSpecialty}
                onChange={(e) => setOtherSpecialty(e.target.value)}
                placeholder="Your specialty"
                className="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">HPCSA registration number</label>
            <input
              required
              value={form.hpcsaNumber}
              onChange={(e) => setForm({ ...form, hpcsaNumber: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="e.g. MP1234567"
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Your listing appears immediately but is marked "verification pending" until an OpenDoc reviewer confirms your HPCSA number.
            </p>
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
              <PasswordInput
                required
                minLength={8}
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
              <LocationAutocomplete
                value={form.address}
                onChange={(name, location) => {
                  setForm({ ...form, address: name })
                  setAddressCoords(location ? { lat: location.lat, lng: location.lng } : null)
                }}
                placeholder="Street address, e.g. 12 Oak Street, Sandton"
              />
              <p className="mt-1 text-xs text-ink-400">Pick a suggestion for an accurate pin on your profile map.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Practice area</label>
              <LocationAutocomplete
                required
                value={form.city}
                onChange={(name, location) => {
                  setForm({ ...form, city: name })
                  setCityCoords(location ? { lat: location.lat, lng: location.lng } : null)
                }}
                placeholder="Search for your city, town, or full address…"
              />
              <p className="mt-1.5 text-xs text-ink-400">Used to show your distance to nearby patients.</p>
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
            <label className="mb-2 block text-sm font-medium text-ink-700">
              Do you accept cash-paying (self-pay) patients without medical aid?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAcceptsCash(true)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold ${
                  acceptsCash ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-300'
                }`}
              >
                Yes, I accept cash
              </button>
              <button
                type="button"
                onClick={() => setAcceptsCash(false)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold ${
                  !acceptsCash ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-ink-200 text-ink-600 hover:border-accent-300'
                }`}
              >
                No, medical aid only
              </button>
            </div>
            {!acceptsCash && (
              <p className="mt-1.5 text-xs text-ink-400">
                Patients without one of the medical aid schemes you accept won't see you as a match.
              </p>
            )}
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
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold ${
                    selectedInsurances.includes(ins)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-ink-200 text-ink-600 hover:border-brand-300'
                  }`}
                >
                  <MedicalAidLogo name={ins} size="sm" />
                  {ins}
                </button>
              ))}
              {customInsurances.map((ins) => (
                <span
                  key={ins}
                  className="flex items-center gap-2 rounded-full border border-brand-500 bg-brand-50 py-1 pl-1 pr-2 text-xs font-semibold text-brand-700"
                >
                  <MedicalAidLogo name={ins} size="sm" />
                  {ins}
                  <button
                    type="button"
                    onClick={() => removeCustomInsurance(ins)}
                    aria-label={`Remove ${ins}`}
                    className="text-brand-500 hover:text-brand-700"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {!showCustomInsuranceInput && (
                <button
                  type="button"
                  onClick={() => setShowCustomInsuranceInput(true)}
                  className="rounded-full border border-dashed border-ink-300 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-600"
                >
                  + Other scheme not listed
                </button>
              )}
            </div>
            {showCustomInsuranceInput && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={customInsuranceInput}
                  onChange={(e) => setCustomInsuranceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomInsurance()
                    }
                  }}
                  placeholder="Scheme name"
                  className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={addCustomInsurance}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
            />
            <span>
              I agree to OpenDoc's{' '}
              <Link to="/terms" target="_blank" className="font-semibold text-brand-600 hover:underline">Terms of Service</Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" className="font-semibold text-brand-600 hover:underline">Privacy Policy</Link>,
              including my responsibilities as a data controller for patient information under POPIA.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || !agreed}
            className="mt-2 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
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
