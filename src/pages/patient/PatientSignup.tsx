import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { ApiError } from '../../api/client'
import { usePatientAuth } from '../../context/PatientAuthContext'

export default function PatientSignup() {
  const navigate = useNavigate()
  const { token, patient, loading, register } = usePatientAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && token && patient) {
    return <Navigate to="/patient/dashboard" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(form)
      navigate('/patient/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-ink-50/60 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white">
            <User size={20} strokeWidth={2.5} />
          </span>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-ink-900">Create your account</h1>
        <p className="mt-1 text-center text-sm text-ink-500">Book faster and keep track of your appointments.</p>

        {error && <div className="mt-5 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First name"
              className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last name"
              className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone (optional)"
            className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />
          <input
            required
            minLength={8}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password (at least 8 characters)"
            className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/patient/login" className="font-semibold text-brand-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
