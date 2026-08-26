import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, GraduationCap, Languages, LocateFixed, MapPin, Navigation, ShieldCheck } from 'lucide-react'
import { api, type ApiDoctor, type Review } from '../api/client'
import StarRating from '../components/StarRating'
import { MedicalAidPill } from '../components/MedicalAidBadge'
import { CASH_LABEL } from '../data/medicalAids'
import { TIME_OPTIONS, buildDayColumns } from '../lib/schedule'
import VerificationBadge from '../components/VerificationBadge'
import Seo from '../components/Seo'

const DoctorsMap = lazy(() => import('../components/DoctorsMap'))

// Opening a maps link with target="_blank" on mobile often prevents the OS
// from handing it off to the installed Waze/Google Maps app.
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export default function DoctorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState<ApiDoctor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [notFound, setNotFound] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ id: number; day: string; time: string } | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  function findMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Location services aren't available in this browser.")
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError("Couldn't get your location — check permissions and try again.")
        setLocating(false)
      },
      { timeout: 10000 },
    )
  }

  useEffect(() => {
    if (!id) return
    api
      .getDoctor(id)
      .then(setDoctor)
      .catch(() => setNotFound(true))
    api.getDoctorReviews(id).then(setReviews).catch(() => {})
  }, [id])

  useEffect(() => {
    if (notFound) navigate('/search', { replace: true })
  }, [notFound, navigate])

  // Stable array identity so the map doesn't re-fit/reset its view on every
  // unrelated re-render (e.g. toggling "Show my location") — only when the
  // doctor itself changes.
  const mapDoctors = useMemo(() => (doctor ? [doctor] : []), [doctor])

  if (notFound) return null

  if (!doctor) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading doctor…</div>
  }

  const dayColumns = buildDayColumns()
  const isOnGrid = (s: ApiDoctor['slots'][number]) =>
    !!s.date && TIME_OPTIONS.includes(s.time) && dayColumns.some((c) => c.iso === s.date)
  const openSlotByKey = new Map(doctor.slots.filter(isOnGrid).map((s) => [`${s.date}|${s.time}`, s]))
  const dayHasSlots = (c: (typeof dayColumns)[number]) => TIME_OPTIONS.some((t) => openSlotByKey.has(`${c.iso}|${t}`))
  const activeDayColumns = dayColumns.filter(dayHasSlots)
  // Slots that don't fit the standard grid — no date, a time outside the
  // usual half-hour slots, or a date beyond the visible window — can't be
  // placed on the grid, so list them separately rather than dropping them.
  const undatedSlots = doctor.slots.filter((s) => !isOnGrid(s))
  const todayIso = dayColumns[0]?.iso

  function handleBook() {
    if (!selectedSlot || !doctor) return
    navigate(
      `/booking/${doctor.id}?slotId=${selectedSlot.id}&day=${encodeURIComponent(selectedSlot.day)}&time=${encodeURIComponent(selectedSlot.time)}`,
    )
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
        <section className="mb-8 rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-center gap-2 text-ink-900">
            <CalendarDays size={18} className="text-brand-500" />
            <h2 className="text-lg font-bold">Book an appointment</h2>
          </div>

          {activeDayColumns.length === 0 && undatedSlots.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">This doctor has no open appointment times right now.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-500">Tap an open (teal-bordered) time to select it.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 w-20 bg-white" />
                      {dayColumns.map((col) => (
                        <th
                          key={col.iso}
                          className={`min-w-[80px] rounded-t-lg pb-1 pt-1.5 text-center font-semibold ${
                            col.iso === todayIso ? 'bg-brand-50 text-brand-700' : 'text-ink-600'
                          }`}
                        >
                          {col.headerLabel}
                          {col.headerLabel !== col.absoluteLabel && (
                            <span className="block text-[10px] font-normal text-ink-400">{col.absoluteLabel}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_OPTIONS.filter((time) => dayColumns.some((col) => openSlotByKey.has(`${col.iso}|${time}`))).map((time) => (
                      <tr key={time}>
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-white pr-2 text-right font-medium text-ink-500">{time}</td>
                        {dayColumns.map((col) => {
                          const slot = openSlotByKey.get(`${col.iso}|${time}`)
                          return (
                            <td key={col.iso} className={`p-0 ${col.iso === todayIso ? 'bg-brand-50/40' : ''}`}>
                              {slot ? (
                                <button
                                  onClick={() =>
                                    setSelectedSlot((prev) =>
                                      prev?.id === slot.id ? null : { id: slot.id, day: col.absoluteLabel, time },
                                    )
                                  }
                                  title={selectedSlot?.id === slot.id ? `${time} — click to unselect` : time}
                                  className={`h-8 w-full rounded-md border-2 font-semibold transition ${
                                    selectedSlot?.id === slot.id
                                      ? 'border-accent-700 bg-accent-500 text-white'
                                      : 'border-brand-300 bg-white text-ink-700 hover:bg-brand-50'
                                  }`}
                                >
                                  &nbsp;
                                </button>
                              ) : (
                                <div className="h-8 w-full" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-500">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-brand-300 bg-white" /> Open</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent-500" /> Selected</span>
              </div>

              {undatedSlots.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {undatedSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot({ id: slot.id, day: slot.day, time: slot.time })}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                        selectedSlot?.id === slot.id
                          ? 'border-accent-500 bg-accent-50 text-accent-600'
                          : 'border-ink-200 text-ink-700 hover:border-brand-300'
                      }`}
                    >
                      {slot.day} &middot; {slot.time}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={!selectedSlot}
                className="mt-5 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400 sm:w-auto sm:px-8"
              >
                {selectedSlot ? `Confirm ${selectedSlot.day} at ${selectedSlot.time}` : 'Select a time'}
              </button>
            </>
          )}
          <p className="mt-3 text-xs text-ink-400">
            Free to book — a quick account keeps your bookings and updates in one place.{' '}
            <Link to="/provider/signup" className="text-brand-600 underline">Are you a doctor? List your practice</Link>
          </p>
        </section>

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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-ink-900">Location</h2>
                  <button
                    onClick={findMyLocation}
                    disabled={locating}
                    className="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
                  >
                    <LocateFixed size={13} />
                    {locating ? 'Finding you…' : 'Show my location'}
                  </button>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                  <MapPin size={14} />
                  {doctor.address}{doctor.city ? `, ${doctor.city}` : ''}
                </p>
                {geoError && <p className="mt-1 text-xs text-accent-600">{geoError}</p>}
                {userLocation && (
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {haversineKm(userLocation, { lat: doctor.lat, lng: doctor.lng }).toFixed(1)} km from your location
                  </p>
                )}
                <div className="mt-4 h-72 overflow-hidden rounded-xl">
                  <Suspense fallback={<div className="h-full w-full animate-pulse bg-ink-50" />}>
                    <DoctorsMap doctors={mapDoctors} userLocation={userLocation ?? undefined} />
                  </Suspense>
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${doctor.lat},${doctor.lng}`}
                    {...(isMobile ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    <Navigation size={14} /> Get directions
                  </a>
                  <a
                    href={`https://waze.com/ul?ll=${doctor.lat},${doctor.lng}&navigate=yes`}
                    {...(isMobile ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                    className="flex items-center justify-center rounded-full border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    Waze
                  </a>
                </div>
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
      </div>
    </div>
  )
}
