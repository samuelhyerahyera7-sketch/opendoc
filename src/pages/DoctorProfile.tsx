import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, GraduationCap, Languages, MapPin, ShieldCheck } from 'lucide-react'
import { api, type ApiDoctor, type Review } from '../api/client'
import StarRating from '../components/StarRating'
import { MedicalAidPill } from '../components/MedicalAidBadge'
import { CASH_LABEL } from '../data/medicalAids'
import VerificationBadge from '../components/VerificationBadge'
import Seo from '../components/Seo'

const DoctorsMap = lazy(() => import('../components/DoctorsMap'))

export default function DoctorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState<ApiDoctor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [notFound, setNotFound] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ id: number; time: string } | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getDoctor(id)
      .then((d) => {
        setDoctor(d)
        const firstDay = d.slots[0]?.day ?? null
        setSelectedDay(firstDay)
      })
      .catch(() => setNotFound(true))
    api.getDoctorReviews(id).then(setReviews).catch(() => {})
  }, [id])

  useEffect(() => {
    if (notFound) navigate('/search', { replace: true })
  }, [notFound, navigate])

  if (notFound) return null

  if (!doctor) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading doctor…</div>
  }

  const days = Array.from(new Set(doctor.slots.map((s) => s.day)))
  const slotsForDay = doctor.slots.filter((s) => s.day === selectedDay)

  function handleBook() {
    if (!selectedSlot || !selectedDay || !doctor) return
    navigate(`/booking/${doctor.id}?slotId=${selectedSlot.id}&day=${encodeURIComponent(selectedDay)}&time=${encodeURIComponent(selectedSlot.time)}`)
  }

  const insuranceList = doctor.insurances.filter((i) => i !== CASH_LABEL)

  return (
    <div className="bg-ink-50/60">
      <Seo
        title={`${doctor.name}, ${doctor.credentials} — ${doctor.specialty}${doctor.city ? ` in ${doctor.city}` : ''}`}
        description={`Book an appointment with ${doctor.name}, ${doctor.credentials} (${doctor.specialty})${doctor.city ? ` in ${doctor.city}` : ''}.${insuranceList.length ? ` Accepts ${insuranceList.slice(0, 3).join(', ')}${insuranceList.length > 3 ? ' and more' : ''}.` : ''}`}
        path={`/doctor/${doctor.id}`}
        image={doctor.photo}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Physician',
          name: `${doctor.name}, ${doctor.credentials}`,
          medicalSpecialty: doctor.specialty,
          image: doctor.photo,
          address: doctor.address ? { '@type': 'PostalAddress', streetAddress: doctor.address, addressLocality: doctor.city, addressCountry: 'ZA' } : undefined,
          ...(doctor.lat && doctor.lng ? { geo: { '@type': 'GeoCoordinates', latitude: doctor.lat, longitude: doctor.lng } } : {}),
          ...(doctor.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: doctor.rating, reviewCount: doctor.reviewCount } } : {}),
        }}
      />
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row">
            <img src={doctor.photo} alt={doctor.name} className="h-28 w-28 shrink-0 rounded-2xl object-cover" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
                {doctor.name}, {doctor.credentials}
              </h1>
              <p className="mt-1 font-medium text-brand-600">{doctor.specialty}</p>
              <div className="mt-2">
                <StarRating rating={doctor.rating} count={doctor.reviewCount} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin size={15} />
                {doctor.address}{doctor.city ? `, ${doctor.city}` : ''}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {doctor.acceptingNew && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
                    <ShieldCheck size={14} /> Accepting new patients
                  </div>
                )}
                <VerificationBadge status={doctor.verificationStatus} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-8">
            <section className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="text-lg font-bold text-ink-900">About</h2>
              <p className="mt-3 text-ink-600">{doctor.bio}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <GraduationCap size={18} className="mt-0.5 shrink-0 text-brand-500" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Education & Training</p>
                    <ul className="mt-1 text-sm text-ink-500">
                      {doctor.education.length ? doctor.education.map((e) => <li key={e}>{e}</li>) : <li>Not provided</li>}
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Languages size={18} className="mt-0.5 shrink-0 text-brand-500" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Languages</p>
                    <p className="mt-1 text-sm text-ink-500">{doctor.languages.join(', ') || 'English'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-ink-900">Medical aid & payment options</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {doctor.acceptsCash && <MedicalAidPill name={CASH_LABEL} />}
                  {doctor.insurances.length === 0 && !doctor.acceptsCash && (
                    <span className="text-sm text-ink-500">Contact office for details</span>
                  )}
                  {doctor.insurances.map((i) => (
                    <MedicalAidPill key={i} name={i} />
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-400">Self-reported by this provider — confirm coverage with your scheme before your visit.</p>
              </div>
            </section>

            {doctor.lat !== null && doctor.lng !== null && (
              <section className="rounded-2xl border border-ink-100 bg-white p-6">
                <h2 className="text-lg font-bold text-ink-900">Location</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                  <MapPin size={14} />
                  {doctor.address}{doctor.city ? `, ${doctor.city}` : ''}
                </p>
                <div className="mt-4 h-72 overflow-hidden rounded-xl">
                  <Suspense fallback={<div className="h-full w-full animate-pulse bg-ink-50" />}>
                    <DoctorsMap
                      doctors={[doctor]}
                      onSelectDoctor={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${doctor.lat},${doctor.lng}`,
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }}
                    />
                  </Suspense>
                </div>
                <p className="mt-2 text-xs text-ink-400">Tap the pin to get directions.</p>
              </section>
            )}

            <section className="rounded-2xl border border-ink-100 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink-900">Patient reviews</h2>
                <StarRating rating={doctor.rating} count={doctor.reviewCount} />
              </div>
              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No reviews yet. Reviews come from patients after a booked visit.</p>
              ) : (
                <div className="mt-5 flex flex-col divide-y divide-ink-100">
                  {reviews.map((r) => (
                    <div key={`${r.patient_name}-${r.created_at}`} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-ink-900">{r.patient_name}</p>
                        <StarRating rating={r.rating} />
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-ink-600">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-ink-900">
              <CalendarDays size={18} className="text-brand-500" />
              <h3 className="font-bold">Book an appointment</h3>
            </div>

            {days.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">This doctor has no open appointment times right now.</p>
            ) : (
              <>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setSelectedDay(d); setSelectedSlot(null) }}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                        selectedDay === d ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {slotsForDay.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot({ id: slot.id, time: slot.time })}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                        selectedSlot?.id === slot.id
                          ? 'border-accent-500 bg-accent-50 text-accent-600'
                          : 'border-ink-200 text-ink-700 hover:border-brand-300'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleBook}
                  disabled={!selectedSlot}
                  className="mt-5 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
                >
                  {selectedSlot ? `Confirm ${selectedDay} at ${selectedSlot.time}` : 'Select a time'}
                </button>
              </>
            )}
            <p className="mt-3 text-center text-xs text-ink-400">
              Free to book. No account required.{' '}
              <Link to="/provider/signup" className="text-brand-600 underline">Are you a doctor? List your practice</Link>
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
