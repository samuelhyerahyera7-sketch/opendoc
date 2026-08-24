import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck2, MessageSquareHeart, ShieldCheck, Sparkles } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import StarRating from '../components/StarRating'
import MedicalAidLogo from '../components/MedicalAidBadge'
import { api, type ApiDoctor, type InsuranceStat, type Specialty } from '../api/client'
import { specialtyIcons } from '../data/staticData'
import { CASH_LABEL, slugifyMedicalAid } from '../data/medicalAids'

const steps = [
  {
    icon: ShieldCheck,
    title: 'Tell us your medical aid',
    text: 'Or tell us you\'re paying cash — either way, we only show doctors who\'ll actually bill the way you pay.',
  },
  {
    icon: Sparkles,
    title: 'Compare matched doctors',
    text: 'Browse ratings, reviews, and real appointment availability — no surprise bills at the front desk.',
  },
  {
    icon: CalendarCheck2,
    title: 'Book online instantly',
    text: 'Pick a time that works for you and confirm your visit in just a couple of clicks.',
  },
]

const testimonials = [
  {
    quote: 'I filtered by Discovery Health and booked a dermatologist the same week — no calling around to check if they bill my scheme.',
    name: 'Priya N.',
    city: 'Sandton, Johannesburg',
  },
  {
    quote: 'Being able to see who takes Bonitas and check real reviews before booking saved me so much time and stress.',
    name: 'Marcus T.',
    city: 'Cape Town CBD',
  },
  {
    quote: 'I pay cash and always struggled to find upfront pricing. OpenDoc showed me exactly who accepts self-pay patients.',
    name: 'Nomvula K.',
    city: 'Umhlanga, Durban',
  },
]

export default function Home() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [featured, setFeatured] = useState<ApiDoctor[]>([])
  const [insuranceStats, setInsuranceStats] = useState<InsuranceStat[]>([])

  useEffect(() => {
    api.getSpecialties().then(setSpecialties).catch(() => {})
    api.getInsuranceStats().then(setInsuranceStats).catch(() => {})
    api
      .searchDoctors({ sort: 'rating', acceptingOnly: true })
      .then((docs) => setFeatured(docs.slice(0, 3)))
      .catch(() => {})
  }, [])

  const cashStat = insuranceStats.find((s) => s.isCash)
  const topSchemes = insuranceStats
    .filter((s) => !s.isCash)
    .sort((a, b) => b.count - a.count)
    .slice(0, 7)

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium ring-1 ring-white/20">
              <ShieldCheck size={14} className="text-accent-300" />
              Only see doctors who actually take your medical aid
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Find the right doctor, matched to how you pay
            </h1>
            <p className="mt-5 text-lg text-brand-100">
              Search by your medical aid scheme — Discovery, Bonitas, Fedhealth, and more — or as a cash-paying
              patient. No surprise bills, no phoning around to check coverage.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <SearchBar />
          </div>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-brand-100">
            <span className="mr-1">Quick pick:</span>
            {cashStat && (
              <Link
                to={`/medical-aid/${slugifyMedicalAid(CASH_LABEL)}`}
                className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-3 ring-1 ring-white/20 hover:bg-white/20"
              >
                <MedicalAidLogo name={CASH_LABEL} size="sm" /> Cash
              </Link>
            )}
            {topSchemes.slice(0, 4).map((s) => (
              <Link
                key={s.name}
                to={`/medical-aid/${slugifyMedicalAid(s.name)}`}
                className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-3 ring-1 ring-white/20 hover:bg-white/20"
              >
                <MedicalAidLogo name={s.name} size="sm" /> {s.name.split(' ')[0]}
              </Link>
            ))}
            <Link to="/medical-aid" className="flex items-center gap-1 font-semibold underline decoration-brand-300 underline-offset-4 hover:text-white">
              All schemes <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-600">
            The OpenDoc difference
          </span>
          <h2 className="mt-3 text-2xl font-bold text-ink-900 sm:text-3xl">Find doctors who accept your medical aid</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-500">
            Every doctor on OpenDoc lists exactly which schemes they bill directly — pick yours and see only doctors who take it.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cashStat && (
            <Link
              to={`/medical-aid/${slugifyMedicalAid(CASH_LABEL)}`}
              className="flex items-center gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <MedicalAidLogo name={CASH_LABEL} size="lg" />
              <div>
                <p className="font-semibold text-ink-900">Cash / Self-pay</p>
                <p className="text-xs text-ink-500">{cashStat.count} doctors</p>
              </div>
            </Link>
          )}
          {topSchemes.map((s) => (
            <Link
              key={s.name}
              to={`/medical-aid/${slugifyMedicalAid(s.name)}`}
              className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <MedicalAidLogo name={s.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">{s.name}</p>
                <p className="text-xs text-ink-500">{s.count} doctor{s.count === 1 ? '' : 's'}</p>
              </div>
            </Link>
          ))}
          <Link
            to="/medical-aid"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 p-5 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50"
          >
            View all schemes <ArrowRight size={15} />
          </Link>
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
