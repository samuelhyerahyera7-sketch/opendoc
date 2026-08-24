import { Link } from 'react-router-dom'
import { BarChart3, CalendarCheck2, FolderSymlink, Users } from 'lucide-react'

const benefits = [
  { icon: Users, title: 'Reach new patients', text: 'Get discovered by patients actively searching for care like yours, filtered by the medical aid you accept.' },
  { icon: CalendarCheck2, title: 'Fill your schedule', text: 'Publish open time slots and let patients book online in real time — no phone tag.' },
  { icon: FolderSymlink, title: 'Transfer patient files securely', text: 'Send patient records to another OpenDoc provider in a few clicks when you refer a patient.' },
  { icon: BarChart3, title: 'Grow with insights', text: 'Track bookings, reviews, and patient trends from one dashboard.' },
]

export default function ForProviders() {
  return (
    <div>
      <section className="bg-gradient-to-b from-brand-800 to-brand-600 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Grow your practice with OpenDoc</h1>
          <p className="mt-4 text-lg text-brand-100">
            List your practice, publish real availability, and securely transfer patient files with other providers on the platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/provider/signup"
              className="rounded-full bg-accent-500 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              Get Started Free
            </Link>
            <Link
              to="/provider/login"
              className="rounded-full bg-white/10 px-8 py-3.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/20"
            >
              Provider Login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border border-ink-100 p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white">
                <b.icon size={26} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink-900">{b.title}</h3>
              <p className="mt-2 text-sm text-ink-500">{b.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
