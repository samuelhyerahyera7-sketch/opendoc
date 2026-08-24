import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { api, ApiError, type ApiDoctor } from '../api/client'

const STORAGE_KEY = 'opendoc.admin.token'

export default function AdminDashboard() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [tokenInput, setTokenInput] = useState('')
  const [pending, setPending] = useState<ApiDoctor[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load(token: string) {
    setError(null)
    api
      .admin.getPendingDoctors(token)
      .then((docs) => {
        setPending(docs)
        localStorage.setItem(STORAGE_KEY, token)
        setAdminToken(token)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Could not load pending doctors.')
        localStorage.removeItem(STORAGE_KEY)
        setAdminToken('')
      })
  }

  useEffect(() => {
    if (adminToken) load(adminToken)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function decide(id: string, action: 'verify' | 'reject') {
    const fn = action === 'verify' ? api.admin.verifyDoctor : api.admin.rejectDoctor
    await fn(adminToken, id)
    setPending((prev) => prev?.filter((d) => d.id !== id) ?? null)
  }

  if (!adminToken) {
    return (
      <div className="flex flex-1 items-center justify-center bg-ink-50/60 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
          <div className="flex justify-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white">
              <ShieldCheck size={20} />
            </span>
          </div>
          <h1 className="mt-4 text-center text-xl font-bold text-ink-900">Admin access</h1>
          <p className="mt-1 text-center text-sm text-ink-500">Enter the admin token for this deployment.</p>
          {error && <div className="mt-4 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load(tokenInput)
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Admin token"
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <button type="submit" className="rounded-full bg-ink-900 py-3 text-sm font-semibold text-white hover:bg-ink-800">
              Continue
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ink-50/60 flex-1">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-ink-900">Doctor verification queue</h1>
        <p className="mt-1 text-sm text-ink-500">Confirm each HPCSA number before approving a listing.</p>

        {pending && pending.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
            Nothing pending review.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {pending?.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-5">
              <div>
                <p className="font-semibold text-ink-900">{d.name}, {d.credentials} — {d.specialty}</p>
                <p className="text-sm text-ink-500">{d.email}</p>
                <p className="mt-1 text-sm font-medium text-ink-700">HPCSA: {d.hpcsaNumber || '—'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => decide(d.id, 'reject')}
                  className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => decide(d.id, 'verify')}
                  className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  Verify
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
