import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, GraduationCap, Languages, MapPin, ShieldCheck } from 'lucide-react'
import { getDoctorById } from '../data/mockData'
import StarRating from '../components/StarRating'

const reviewSamples = [
  { name: 'Jordan P.', text: 'Very thorough and took the time to answer all of my questions. Highly recommend.', rating: 5 },
  { name: 'Casey M.', text: 'Front desk was friendly and the wait was short. Great overall experience.', rating: 5 },
  { name: 'Alex R.', text: 'Professional and knowledgeable. Explained everything clearly before proceeding.', rating: 4 },
]

const days = ['Today', 'Tomorrow', 'Wed, Aug 26', 'Thu, Aug 27', 'Fri, Aug 28']

export default function DoctorProfile() {
  const { id } = useParams()
  const doctor = id ? getDoctorById(id) : undefined
  const navigate = useNavigate()
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  if (!doctor) return <Navigate to="/search" replace />

  function handleBook() {
    if (!selectedSlot) return
    navigate(`/booking/${doctor!.id}?day=${encodeURIComponent(days[selectedDay])}&time=${encodeURIComponent(selectedSlot)}`)
  }

  return (
    <div className="bg-ink-50/60">
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
                {doctor.address}, {doctor.city}
              </div>
              {doctor.acceptingNew && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
                  <ShieldCheck size={14} /> Accepting new patients
                </div>
              )}
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
                      {doctor.education.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Languages size={18} className="mt-0.5 shrink-0 text-brand-500" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Languages</p>
                    <p className="mt-1 text-sm text-ink-500">{doctor.languages.join(', ')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-ink-900">Insurance accepted</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {doctor.insurances.length === 0 && <span className="text-sm text-ink-500">Contact office for details</span>}
                  {doctor.insurances.map((i) => (
                    <span key={i} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">{i}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-ink-100 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink-900">Patient reviews</h2>
                <StarRating rating={doctor.rating} count={doctor.reviewCount} />
              </div>
              <div className="mt-5 flex flex-col divide-y divide-ink-100">
                {reviewSamples.map((r) => (
                  <div key={r.name} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink-900">{r.name}</p>
                      <StarRating rating={r.rating} />
                    </div>
                    <p className="mt-2 text-sm text-ink-600">{r.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-ink-900">
              <CalendarDays size={18} className="text-brand-500" />
              <h3 className="font-bold">Book an appointment</h3>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {days.map((d, i) => (
                <button
                  key={d}
                  onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                    selectedDay === i ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {doctor.slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                    selectedSlot === slot
                      ? 'border-accent-500 bg-accent-50 text-accent-600'
                      : 'border-ink-200 text-ink-700 hover:border-brand-300'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            <button
              onClick={handleBook}
              disabled={!selectedSlot}
              className="mt-5 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
            >
              {selectedSlot ? `Confirm ${days[selectedDay]} at ${selectedSlot}` : 'Select a time'}
            </button>
            <p className="mt-3 text-center text-xs text-ink-400">
              Free to book. No account required to view times.{' '}
              <Link to="/signup" className="text-brand-600 underline">Sign up</Link> to save your visit history.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
