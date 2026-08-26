import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Menu, User, X } from 'lucide-react'
import { useState } from 'react'
import { useDoctorAuth } from '../context/DoctorAuthContext'
import { usePatientAuth } from '../context/PatientAuthContext'
import logoIcon from '../assets/opendoc-icon.png'

export default function Header() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { doctor } = useDoctorAuth()
  const { patient } = usePatientAuth()
  // The patient "Log In" link is a separate account system from the doctor
  // one. A doctor who is logged in (with their own Dashboard button right
  // there) but has no patient account has no use for it — on any page, not
  // just the provider dashboard — so hide it whenever a doctor session
  // exists and there's no patient session to show instead.
  const showPatientLink = !!patient || !doctor

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoIcon} alt="OpenDoc" className="h-9 w-auto" />
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-ink-900">open</span>
            <span className="text-brand-500">doc</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
          <Link to="/medical-aid" className="flex items-center gap-1.5 text-brand-700 hover:text-brand-600">
            Medical Aid
          </Link>
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
          {showPatientLink && (
            <Link
              to={patient ? '/patient/dashboard' : '/patient/login'}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50"
            >
              <User size={15} /> {patient ? patient.firstName : 'Log In'}
            </Link>
          )}
          {doctor ? (
            <Link
              to="/provider/dashboard"
              className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              <LayoutDashboard size={15} /> Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/provider/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
              >
                Provider Login
              </Link>
              <Link
                to="/provider/signup"
                className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                List Your Practice
              </Link>
            </>
          )}
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
            <Link onClick={() => setOpen(false)} to="/medical-aid" className="rounded-md px-2 py-2 font-semibold text-brand-700 hover:bg-ink-50">
              Medical Aid
            </Link>
            <button onClick={() => { setOpen(false); navigate('/search') }} className="rounded-md px-2 py-2 text-left hover:bg-ink-50">
              Find Care
            </button>
            <Link onClick={() => setOpen(false)} to="/for-providers" className="rounded-md px-2 py-2 hover:bg-ink-50">
              For Providers
            </Link>
            {showPatientLink && (
              <Link
                onClick={() => setOpen(false)}
                to={patient ? '/patient/dashboard' : '/patient/login'}
                className="rounded-md px-2 py-2 hover:bg-ink-50"
              >
                {patient ? `My Account (${patient.firstName})` : 'Log In'}
              </Link>
            )}
            {doctor ? (
              <Link
                onClick={() => setOpen(false)}
                to="/provider/dashboard"
                className="mt-1 rounded-full bg-brand-500 px-4 py-2 text-center font-semibold text-white"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link onClick={() => setOpen(false)} to="/provider/login" className="rounded-md px-2 py-2 hover:bg-ink-50">
                  Provider Login
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  to="/provider/signup"
                  className="mt-1 rounded-full bg-brand-500 px-4 py-2 text-center font-semibold text-white"
                >
                  List Your Practice
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
