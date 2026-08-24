import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    navigate('/')
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-ink-50/60 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white">
            <Search size={20} strokeWidth={2.5} />
          </span>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-ink-900">Create your account</h1>
        <p className="mt-1 text-center text-sm text-ink-500">It's free and takes less than a minute.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Full name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="Jamie Rivera"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Password</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="Create a password"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
