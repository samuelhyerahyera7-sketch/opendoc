import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { api, type InsuranceStat } from '../api/client'
import MedicalAidLogo from '../components/MedicalAidBadge'
import { CASH_LABEL, slugifyMedicalAid } from '../data/medicalAids'
import Seo from '../components/Seo'

export default function MedicalAidHub() {
  const [stats, setStats] = useState<InsuranceStat[] | null>(null)

  useEffect(() => {
    api.getInsuranceStats().then(setStats).catch(() => setStats([]))
  }, [])

  const cash = stats?.find((s) => s.isCash)
  const schemes = stats?.filter((s) => !s.isCash).sort((a, b) => b.count - a.count) ?? []

  return (
    <div className="bg-ink-50/60 flex-1">
      <Seo
        title="Find Doctors by Medical Aid Scheme"
        description="Browse South African doctors by the medical aid scheme they accept — Discovery Health, Bonitas, Fedhealth, Momentum, GEMS, and more — or find cash-paying options."
        path="/medical-aid"
      />
      <section className="bg-gradient-to-b from-brand-800 to-brand-600 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium ring-1 ring-white/20">
            <ShieldCheck size={14} className="text-accent-300" />
            Payment matching, done for you
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Find doctors who take your medical aid
          </h1>
          <p className="mt-4 text-brand-100">
            Pick your scheme below to see only the doctors on OpenDoc who bill it directly — or search as a
            cash-paying patient if you're not on a medical aid.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {cash && (
          <Link
            to={`/medical-aid/${slugifyMedicalAid(CASH_LABEL)}`}
            className="mb-8 flex items-center gap-5 rounded-2xl border border-accent-200 bg-accent-50 p-6 transition hover:shadow-md"
          >
            <MedicalAidLogo name={CASH_LABEL} size="lg" />
            <div className="flex-1">
              <p className="font-bold text-ink-900">Cash / Self-pay</p>
              <p className="text-sm text-ink-600">No medical aid? {cash.count} doctors on OpenDoc accept cash-paying patients.</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-accent-600" />
          </Link>
        )}

        <h2 className="mb-4 text-lg font-bold text-ink-900">Medical aid schemes</h2>

        {!stats ? (
          <p className="text-ink-400">Loading schemes…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schemes.map((s) => (
              <Link
                key={s.name}
                to={`/medical-aid/${slugifyMedicalAid(s.name)}`}
                className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <MedicalAidLogo name={s.name} size="lg" />
                <div className="flex-1">
                  <p className="font-semibold text-ink-900">{s.name}</p>
                  <p className="text-sm text-ink-500">
                    {s.count > 0 ? `${s.count} doctor${s.count === 1 ? '' : 's'} in network` : 'No doctors yet — be the first'}
                  </p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-ink-300" />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
          <p className="font-semibold text-ink-900">Don't see your scheme, or you're a provider?</p>
          <p className="mt-1 text-sm text-ink-500">
            Doctors can list which medical aids they bill directly in under a minute.
          </p>
          <Link
            to="/provider/signup"
            className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            List your practice
          </Link>
        </div>
      </div>
    </div>
  )
}
