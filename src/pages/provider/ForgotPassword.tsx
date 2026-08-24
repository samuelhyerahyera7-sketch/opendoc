import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api, ApiError } from '../../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.forgotPassword(email)
      setSubmitted(true)
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
            <Search size={20} strokeWidth={2.5} />
          </span>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-ink-900">Reset your password</h1>

        {submitted ? (
          <p className="mt-4 text-center text-sm text-ink-600">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. It expires in 1 hour.
          </p>
        ) : (
          <>
            <p className="mt-1 text-center text-sm text-ink-500">We'll email you a link to reset it.</p>
            {error && <div className="mt-5 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                  placeholder="you@practice.com"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link to="/provider/login" className="font-semibold text-brand-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
