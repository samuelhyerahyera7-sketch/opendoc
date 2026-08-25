import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Crosshair, Loader2, ShieldCheck } from 'lucide-react'
import { api, type ApiDoctor, type Specialty } from '../api/client'
import DoctorCard from '../components/DoctorCard'
import MedicalAidLogo from '../components/MedicalAidBadge'
import { CASH_LABEL, unslugifyMedicalAid, slugifyMedicalAid } from '../data/medicalAids'
import Seo from '../components/Seo'

export default function MedicalAidSchemePage() {
  const { slug } = useParams()
  const [allNames, setAllNames] = useState<string[] | null>(null)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [doctors, setDoctors] = useState<ApiDoctor[] | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  useEffect(() => {
    api.getInsurances().then(setAllNames).catch(() => setAllNames([]))
    api.getSpecialties().then(setSpecialties).catch(() => {})
  }, [])

  const name = allNames && slug ? unslugifyMedicalAid(slug, allNames) : undefined

  useEffect(() => {
    if (!name) return
    setDoctors(null)
    api
      .searchDoctors({
        insurance: name,
        specialty: specialtyFilter,
        sort: coords ? 'distance' : 'rating',
        lat: coords?.lat,
        lng: coords?.lng,
      })
      .then(setDoctors)
      .catch(() => setDoctors([]))
  }, [name, specialtyFilter, coords])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Location services are not available in this browser.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError("Couldn't get your location — check permissions and try again.")
        setLocating(false)
      },
      { timeout: 10000 },
    )
  }

  if (allNames && slug && !name) {
    return <Navigate to="/medical-aid" replace />
  }

  if (!name) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading…</div>
  }

  const isCash = name === CASH_LABEL
  const specialtiesInResults = specialties.filter((s) => doctors?.some((d) => d.specialty === s.name))

  return (
    <div className="bg-ink-50/60 flex-1">
      <Seo
        title={isCash ? 'Doctors Accepting Cash-Paying Patients in South Africa' : `Doctors Who Accept ${name}`}
        description={
          isCash
            ? 'Find and book doctors across South Africa who accept cash-paying, self-pay patients without medical aid.'
            : `Find and book doctors across South Africa who accept ${name}. Search by specialty and location, then book your appointment online.`
        }
        path={`/medical-aid/${slugifyMedicalAid(name)}`}
      />
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link to="/medical-aid" className="text-sm font-medium text-brand-600 hover:underline">
            &larr; All medical aid schemes
          </Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <MedicalAidLogo name={name} size="lg" />
              <div>
                <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
                  {isCash ? 'Doctors accepting cash-paying patients' : `Doctors who accept ${name}`}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                  <ShieldCheck size={14} className="text-brand-500" />
                  {doctors ? `${doctors.length} doctor${doctors.length === 1 ? '' : 's'} on OpenDoc` : 'Loading…'}
                  {isCash ? ' take cash-paying, self-funded patients.' : ` bill ${name} directly — book online, no calling around.`}
                </p>
              </div>
            </div>
            <button
              onClick={useMyLocation}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                coords ? 'bg-brand-500 text-white' : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50'
              }`}
            >
              {locating ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />}
              {coords ? 'Sorted by distance' : 'Sort by distance near me'}
            </button>
          </div>
          {geoError && <p className="mt-2 text-xs text-accent-600">{geoError}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {specialtiesInResults.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSpecialtyFilter('')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                !specialtyFilter ? 'bg-brand-500 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'
              }`}
            >
              All specialties
            </button>
            {specialtiesInResults.map((s) => (
              <button
                key={s.name}
                onClick={() => setSpecialtyFilter(s.name)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  specialtyFilter === s.name ? 'bg-brand-500 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'
                }`}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        )}

        {!doctors ? (
          <p className="text-ink-400">Loading doctors…</p>
        ) : doctors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-ink-800">No doctors yet for {isCash ? 'this option' : name}</p>
            <p className="mt-1 text-sm text-ink-500">Check back soon, or browse all doctors and filter by specialty instead.</p>
            <Link to="/search" className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              Browse all doctors
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {doctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
