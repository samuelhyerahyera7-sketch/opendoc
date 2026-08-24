import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, MessageSquareHeart, ShieldCheck, Sparkles } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import StarRating from '../components/StarRating'
import { api, type ApiDoctor, type Specialty } from '../api/client'
import { specialtyIcons } from '../data/staticData'

const steps = [
  {
    icon: Sparkles,
    title: 'Search for care',
    text: 'Tell us the specialty, condition, or doctor you’re looking for and where you are.',
  },
  {
    icon: ShieldCheck,
    title: 'Compare verified doctors',
    text: 'Browse ratings, reviews, medical aid accepted, and real appointment availability.',
  },
  {
    icon: CalendarCheck2,
    title: 'Book online instantly',
    text: 'Pick a time that works for you and confirm your visit in just a couple of clicks.',
  },
]

const testimonials = [
  {
    quote: 'I found a dermatologist who takes my medical aid and booked a same-week appointment in minutes.',
    name: 'Priya S.',
    city: 'New York, NY',
  },
  {
    quote: 'Being able to see real reviews and check my medical aid coverage before booking saved me so much time and stress.',
    name: 'Marcus T.',
    city: 'Brooklyn, NY',
  },
  {
    quote: 'I switched primary care doctors after moving and OpenDoc made the whole process painless.',
    name: 'Grace L.',
    city: 'Jersey City, NJ',
  },
]

export default function Home() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [featured, setFeatured] = useState<ApiDoctor[]>([])

  useEffect(() => {
    api.getSpecialties().then(setSpecialties).catch(() => {})
    api
      .searchDoctors({ sort: 'rating', acceptingOnly: true })
      .then((docs) => setFeatured(docs.slice(0, 3)))
      .catch(() => {})
  }, [])

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium ring-1 ring-white/20">
              <Sparkles size={14} className="text-accent-300" />
              Find and book care that fits your schedule
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              The easiest way to find the right doctor
            </h1>
            <p className="mt-5 text-lg text-brand-100">
              Compare thousands of verified doctors by rating, medical aid accepted, and availability — then book online, free.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <SearchBar />
          </div>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-100">
            <span>Popular:</span>
            {['Dermatologist', 'Dentist', 'Therapist', 'OB-GYN', 'Eye Doctor'].map((s) => (
              <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="underline decoration-brand-300 underline-offset-4 hover:text-white">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-ink-900 sm:text-3xl">Browse by specialty</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-ink-500">
          From routine checkups to specialist care, find exactly who you need.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {specialties.map((s) => (
            <Link
              key={s.name}
              to={`/search?q=${encodeURIComponent(s.name)}`}
              className="flex flex-col items-center gap-3 rounded-2xl border border-ink-100 p-6 text-center transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow-md"
            >
              <span className="text-3xl">{specialtyIcons[s.name] ?? s.icon}</span>
              <span className="text-sm font-semibold text-ink-800">{s.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-ink-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-ink-900 sm:text-3xl">How OpenDoc works</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-ink-100">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white">
                  <step.icon size={26} />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-accent-500">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-ink-900">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">Top-rated doctors near you</h2>
              <p className="mt-2 text-ink-500">Highly reviewed providers accepting new patients.</p>
            </div>
            <Link to="/search" className="hidden shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:block">
              See all doctors &rarr;
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((d) => (
              <Link
                key={d.id}
                to={`/doctor/${d.id}`}
                className="flex flex-col gap-4 rounded-2xl border border-ink-100 p-6 transition hover:shadow-lg hover:shadow-ink-900/5"
              >
                <div className="flex items-center gap-4">
                  <img src={d.photo} alt={d.name} className="h-16 w-16 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-ink-900">{d.name}, {d.credentials}</p>
                    <p className="text-sm text-brand-600">{d.specialty}</p>
                  </div>
                </div>
                <StarRating rating={d.rating} count={d.reviewCount} />
                <div className="mt-auto rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                  {d.slots.length > 0 ? `Next available: ${d.slots[0].day} at ${d.slots[0].time}` : 'Booking currently full'}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-brand-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-accent-300">
            <MessageSquareHeart size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">Patient stories</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Loved by patients across the country</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <p className="text-brand-100">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-brand-300">{t.city}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-accent-500 px-8 py-14 text-center text-white sm:px-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Are you a healthcare provider?</h2>
          <p className="mx-auto mt-3 max-w-xl text-accent-50">
            Join OpenDoc to list your practice, fill your schedule, and securely transfer patient files with other providers.
          </p>
          <Link
            to="/provider/signup"
            className="mt-6 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-accent-600 transition hover:bg-accent-50"
          >
            List Your Practice
          </Link>
        </div>
      </section>
    </>
  )
}
