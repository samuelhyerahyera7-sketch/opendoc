import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MapPin, ShieldCheck } from 'lucide-react'
import { api, type ApiDoctor } from '../api/client'
import DoctorCard from '../components/DoctorCard'
import Seo from '../components/Seo'
import { findMetroBySlug, metros } from '../data/metros'
import { findSpecialtyBySlug, slugifySpecialty, specialtyIcons } from '../data/staticData'

const RADIUS_KM = 30

export default function SpecialtyCityPage() {
  const { specialtySlug, citySlug } = useParams()
  const [doctors, setDoctors] = useState<ApiDoctor[] | null>(null)

  const specialty = specialtySlug ? findSpecialtyBySlug(specialtySlug) : undefined
  const metro = citySlug ? findMetroBySlug(citySlug) : undefined

  useEffect(() => {
    if (!specialty || !metro) return
    setDoctors(null)
    api
      .searchDoctors({ specialty, lat: metro.lat, lng: metro.lng, radiusKm: RADIUS_KM, sort: 'distance' })
      .then(setDoctors)
      .catch(() => setDoctors([]))
  }, [specialty, metro])

  if (specialtySlug && !specialty) return <Navigate to="/search" replace />
  if (citySlug && !metro) return <Navigate to="/search" replace />
  if (!specialty || !metro) return null

  const icon = specialtyIcons[specialty]

  return (
    <div className="bg-ink-50/60 flex-1">
      <Seo
        title={`${specialty} in ${metro.name}`}
        description={`Find and book a ${specialty.toLowerCase()} in ${metro.name}, South Africa. Filter by medical aid, see real availability, and book online — no calling around.`}
        path={`/doctors/${slugifySpecialty(specialty)}/${metro.slug}`}
      />
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link to="/doctors" className="text-sm font-medium text-brand-600 hover:underline">
            &larr; Browse all specialties and cities
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-3xl">{icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
                {specialty} in {metro.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin size={14} className="text-brand-500" />
                {doctors ? `${doctors.length} ${specialty.toLowerCase()}${doctors.length === 1 ? '' : 's'} within ${RADIUS_KM}km of ${metro.name}` : 'Loading…'}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-ink-600">
            Every doctor listed here publishes exactly which medical aid schemes they accept, so you can confirm
            coverage before booking — no calling around to check.{' '}
            <span className="inline-flex items-center gap-1 font-medium text-brand-600">
              <ShieldCheck size={13} /> Verified availability, booked online.
            </span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!doctors ? (
          <p className="text-ink-400">Loading doctors…</p>
        ) : doctors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-ink-800">
              No {specialty.toLowerCase()}s listed in {metro.name} yet
            </p>
            <p className="mt-1 text-sm text-ink-500">Check back soon, or browse all doctors and specialties instead.</p>
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

        <div className="mt-10 rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="text-sm font-bold text-ink-900">Looking for {specialty} elsewhere in South Africa?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {metros
              .filter((m) => m.slug !== metro.slug)
              .map((m) => (
                <Link
                  key={m.slug}
                  to={`/doctors/${slugifySpecialty(specialty)}/${m.slug}`}
                  className="rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-600"
                >
                  {specialty} in {m.name}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
