import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { User } from 'lucide-react'
import { api, ApiError } from '../../api/client'

export default function PatientResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.resetPatientPassword(token, password)
      setDone(true)
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
        <h1 className="mt-4 text-center text-2xl font-bold text-ink-900">Set a new password</h1>

        {!token ? (
          <p className="mt-4 text-center text-sm text-accent-700">This reset link is missing its token.</p>
        ) : done ? (
          <>
            <p className="mt-4 text-center text-sm text-ink-600">Your password has been updated.</p>
            <button
              onClick={() => navigate('/patient/login')}
              className="mt-6 w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Log in
            </button>
          </>
        ) : (
          <>
            {error && <div className="mt-5 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">New password</label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                  placeholder="At least 8 characters"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link to="/patient/login" className="font-semibold text-brand-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
