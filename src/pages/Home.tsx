import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import MedicalAidLogo from '../components/MedicalAidBadge'
import { api, type InsuranceStat } from '../api/client'
import { CASH_LABEL, slugifyMedicalAid } from '../data/medicalAids'
import Seo from '../components/Seo'

export default function Home() {
  const [insuranceStats, setInsuranceStats] = useState<InsuranceStat[]>([])

  useEffect(() => {
    api.getInsuranceStats().then(setInsuranceStats).catch(() => {})
  }, [])

  const cashStat = insuranceStats.find((s) => s.isCash)
  const topSchemes = insuranceStats
    .filter((s) => !s.isCash)
    .sort((a, b) => b.count - a.count)
    .slice(0, 7)

  return (
    <>
      <Seo
        title="OpenDoc — Find Doctors Who Take Your Medical Aid"
        description="Find and book doctors in South Africa who accept your medical aid — Discovery, Bonitas, Fedhealth, Momentum, and more — or pay cash. Search by specialty, location, or condition and book online."
        path="/"
      />
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Find doctors who take your medical aid
            </h1>
            <p className="mt-5 text-lg text-brand-100">
              Search by scheme, book online, done. No calling around to check who bills Discovery, Bonitas, or
              Fedhealth — or find a doctor who takes cash.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <SearchBar />
          </div>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-brand-100">
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
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">Or pick your scheme to start</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-500">
            Every doctor on OpenDoc lists exactly which schemes they bill directly.
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

        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-ink-500">
          <ShieldCheck size={15} className="text-brand-500" />
          Are you a doctor?{' '}
          <Link to="/provider/signup" className="font-semibold text-brand-600 hover:underline">List your practice</Link>
        </div>
      </section>
    </>
  )
}
