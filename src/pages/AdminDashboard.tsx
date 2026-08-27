import { useEffect, useState } from 'react'
import { ChevronDown, ShieldCheck, Trash2 } from 'lucide-react'
import { api, ApiError, type AdminIdentity, type ApiDoctor } from '../api/client'
import PasswordInput from '../components/PasswordInput'

type Tab = 'pending' | 'all'

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<ApiDoctor[] | null>(null)
  const [all, setAll] = useState<ApiDoctor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function load() {
    setError(null)
    Promise.all([api.admin.getPendingDoctors(), api.admin.getAllDoctors()])
      .then(([pendingDocs, allDocs]) => {
        setPending(pendingDocs)
        setAll(allDocs)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Could not load doctors.')
      })
  }

  useEffect(() => {
    api.admin
      .me()
      .then((me) => {
        setAdmin(me)
        load()
      })
      .catch(() => setAdmin(null))
      .finally(() => setCheckingSession(false))
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoggingIn(true)
    try {
      const me = await api.admin.login(emailInput, passwordInput)
      setAdmin(me)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await api.admin.logout().catch(() => {})
    setAdmin(null)
    setPending(null)
    setAll(null)
  }

  async function decide(id: string, action: 'verify' | 'reject') {
    const fn = action === 'verify' ? api.admin.verifyDoctor : api.admin.rejectDoctor
    const updated = await fn(id)
    setPending((prev) => prev?.filter((d) => d.id !== id) ?? null)
    setAll((prev) => prev?.map((d) => (d.id === id ? updated : d)) ?? null)
  }

  async function suspend(id: string) {
    const reason = window.prompt('Reason for suspension (shown to the doctor):') || undefined
    const updated = await api.admin.suspendDoctor(id, reason)
    setAll((prev) => prev?.map((d) => (d.id === id ? updated : d)) ?? null)
  }

  async function reactivate(id: string) {
    const updated = await api.admin.reactivateDoctor(id)
    setAll((prev) => prev?.map((d) => (d.id === id ? updated : d)) ?? null)
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Permanently delete ${name}? This also removes their appointments, files, and reviews.`)) return
    await api.admin.deleteDoctor(id)
    setPending((prev) => prev?.filter((d) => d.id !== id) ?? null)
    setAll((prev) => prev?.filter((d) => d.id !== id) ?? null)
  }

  if (checkingSession) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading…</div>
  }

  if (!admin) {
    return (
      <div className="flex flex-1 items-center justify-center bg-ink-50/60 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
          <div className="flex justify-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white">
              <ShieldCheck size={20} />
            </span>
          </div>
          <h1 className="mt-4 text-center text-xl font-bold text-ink-900">Admin login</h1>
          <p className="mt-1 text-center text-sm text-ink-500">Sign in with your admin account.</p>
          {error && <div className="mt-4 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
          <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <PasswordInput
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={loggingIn}
              className="rounded-full bg-ink-900 py-3 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
            >
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const list = tab === 'pending' ? pending : all
  const canDecide = admin.role === 'super_admin' || admin.role === 'verification_admin'
  const canDelete = admin.role === 'super_admin'

  return (
    <div className="bg-ink-50/60 flex-1">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink-900">Doctor directory</h1>
            <p className="mt-1 text-sm text-ink-500">Review verification requests, or manage the full directory.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ink-800">{admin.email}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs capitalize text-ink-400">{admin.role.replace('_', ' ')}</p>
              <button onClick={handleLogout} className="text-xs font-semibold text-brand-600 hover:underline">
                Log out
              </button>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setTab('pending')}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${tab === 'pending' ? 'bg-brand-500 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200'}`}
          >
            Pending review ({pending?.length ?? '…'})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${tab === 'all' ? 'bg-brand-500 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200'}`}
          >
            All doctors ({all?.length ?? '…'})
          </button>
        </div>

        {list && list.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
            {tab === 'pending' ? 'Nothing pending review.' : 'No doctors in the directory.'}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {list?.map((d) => {
            const expanded = expandedId === d.id
            return (
              <div key={d.id} className="rounded-2xl border border-ink-100 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <ChevronDown
                      size={16}
                      className={`mt-1 shrink-0 text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                    <div>
                      <p className="font-semibold text-ink-900">{d.name}, {d.credentials} — {d.specialty}</p>
                      <p className="text-sm text-ink-500">{d.email}</p>
                      <p className="mt-1 text-sm font-medium text-ink-700">
                        HPCSA: {d.hpcsaNumber || '—'} &middot; <span className="capitalize">{d.verificationStatus}</span>
                      </p>
                      {d.rejectionReason && (
                        <p className="mt-1 text-xs text-accent-600">Reason: {d.rejectionReason}</p>
                      )}
                    </div>
                  </button>
                  {canDecide && (
                    <div className="flex flex-wrap gap-2">
                      {d.verificationStatus !== 'rejected' && (
                        <button
                          onClick={() => decide(d.id, 'reject')}
                          className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                        >
                          Reject
                        </button>
                      )}
                      {d.verificationStatus !== 'verified' && (
                        <button
                          onClick={() => decide(d.id, 'verify')}
                          className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
                        >
                          Verify
                        </button>
                      )}
                      {d.verificationStatus === 'suspended' ? (
                        <button
                          onClick={() => reactivate(d.id)}
                          className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                        >
                          Reactivate
                        </button>
                      ) : (
                        d.verificationStatus === 'verified' && (
                          <button
                            onClick={() => suspend(d.id)}
                            className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                          >
                            Suspend
                          </button>
                        )
                      )}
                      {canDelete && (
                        <button
                          onClick={() => remove(d.id, d.name)}
                          title="Delete permanently"
                          className="flex items-center gap-1.5 rounded-full border border-accent-200 px-4 py-2 text-xs font-semibold text-accent-700 hover:bg-accent-50"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {expanded && (
                  <div className="mt-4 flex flex-col gap-4 border-t border-ink-100 pt-4 sm:flex-row">
                    <img src={d.photo} alt={d.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Practice address</p>
                        <p className="text-sm text-ink-700">{d.address || '—'}{d.city ? `, ${d.city}` : ''}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Email verified</p>
                        <p className="text-sm text-ink-700">{d.emailVerified ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Accepting new patients</p>
                        <p className="text-sm text-ink-700">{d.acceptingNew ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Accepts cash</p>
                        <p className="text-sm text-ink-700">{d.acceptsCash ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Languages</p>
                        <p className="text-sm text-ink-700">{d.languages.join(', ') || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Rating</p>
                        <p className="text-sm text-ink-700">
                          {d.reviewCount > 0 ? `${d.rating.toFixed(1)} (${d.reviewCount} review${d.reviewCount === 1 ? '' : 's'})` : 'No reviews yet'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Education</p>
                        {d.education.length ? (
                          <ul className="text-sm text-ink-700">
                            {d.education.map((e) => <li key={e}>{e}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-ink-700">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-ink-400">Medical aids accepted</p>
                        <p className="text-sm text-ink-700">{d.insurances.join(', ') || '—'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold uppercase text-ink-400">Bio</p>
                        <p className="text-sm text-ink-700">{d.bio || '—'}</p>
                      </div>
                      {d.verificationNotes && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold uppercase text-ink-400">Verification notes</p>
                          <p className="text-sm text-ink-700">{d.verificationNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
