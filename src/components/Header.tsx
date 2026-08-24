import { Link, useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
            <Search size={18} strokeWidth={2.5} />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-ink-900">OpenDoc</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
          <button onClick={() => navigate('/search')} className="hover:text-brand-600">
            Find Care
          </button>
          <Link to="/for-providers" className="hover:text-brand-600">
            For Providers
          </Link>
          <a href="#how-it-works" className="hover:text-brand-600">
            How It Works
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            Sign Up
          </Link>
        </div>

        <button
          className="grid h-9 w-9 place-items-center rounded-md text-ink-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-100 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            <button onClick={() => { setOpen(false); navigate('/search') }} className="rounded-md px-2 py-2 text-left hover:bg-ink-50">
              Find Care
            </button>
            <Link onClick={() => setOpen(false)} to="/for-providers" className="rounded-md px-2 py-2 hover:bg-ink-50">
              For Providers
            </Link>
            <Link onClick={() => setOpen(false)} to="/login" className="rounded-md px-2 py-2 hover:bg-ink-50">
              Log In
            </Link>
            <Link
              onClick={() => setOpen(false)}
              to="/signup"
              className="mt-1 rounded-full bg-brand-500 px-4 py-2 text-center font-semibold text-white"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
