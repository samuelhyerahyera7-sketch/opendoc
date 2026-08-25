import { useEffect, useState } from 'react'
import { ChevronDown, ShieldCheck, Trash2 } from 'lucide-react'
import { api, ApiError, type ApiDoctor } from '../api/client'

const STORAGE_KEY = 'opendoc.admin.token'
type Tab = 'pending' | 'all'

export default function AdminDashboard() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [tokenInput, setTokenInput] = useState('')
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<ApiDoctor[] | null>(null)
  const [all, setAll] = useState<ApiDoctor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function load(token: string) {
    setError(null)
    Promise.all([api.admin.getPendingDoctors(token), api.admin.getAllDoctors(token)])
      .then(([pendingDocs, allDocs]) => {
        setPending(pendingDocs)
        setAll(allDocs)
        localStorage.setItem(STORAGE_KEY, token)
        setAdminToken(token)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Could not load doctors.')
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
    const updated = await fn(adminToken, id)
    setPending((prev) => prev?.filter((d) => d.id !== id) ?? null)
    setAll((prev) => prev?.map((d) => (d.id === id ? updated : d)) ?? null)
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Permanently delete ${name}? This also removes their appointments, files, and reviews.`)) return
    await api.admin.deleteDoctor(adminToken, id)
    setPending((prev) => prev?.filter((d) => d.id !== id) ?? null)
    setAll((prev) => prev?.filter((d) => d.id !== id) ?? null)
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

  const list = tab === 'pending' ? pending : all

  return (
    <div className="bg-ink-50/60 flex-1">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-ink-900">Doctor directory</h1>
        <p className="mt-1 text-sm text-ink-500">Review verification requests, or manage the full directory.</p>

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
                    </div>
                  </button>
                  <div className="flex gap-2">
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
                    <button
                      onClick={() => remove(d.id, d.name)}
                      title="Delete permanently"
                      className="flex items-center gap-1.5 rounded-full border border-accent-200 px-4 py-2 text-xs font-semibold text-accent-700 hover:bg-accent-50"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
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
