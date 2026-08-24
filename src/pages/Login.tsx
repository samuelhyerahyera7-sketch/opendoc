import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        <h1 className="mt-4 text-center text-2xl font-bold text-ink-900">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-ink-500">Log in to manage your appointments.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Log In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
