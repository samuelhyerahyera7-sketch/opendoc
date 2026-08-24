import { Link } from 'react-router-dom'
import { CalendarCheck2, MapPin, ShieldCheck } from 'lucide-react'
import type { ApiDoctor } from '../api/client'
import StarRating from './StarRating'
import { MedicalAidPill } from './MedicalAidBadge'
import { CASH_LABEL } from '../data/medicalAids'

export default function DoctorCard({ doctor }: { doctor: ApiDoctor }) {
  const nextSlot = doctor.slots[0]

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-ink-100 bg-white p-5 transition hover:shadow-lg hover:shadow-ink-900/5 sm:flex-row">
      <img
        src={doctor.photo}
        alt={doctor.name}
        className="h-24 w-24 shrink-0 self-center rounded-xl object-cover sm:self-start"
      />
      <div className="flex-1">
        <Link to={`/doctor/${doctor.id}`} className="text-lg font-bold text-ink-900 hover:text-brand-600">
          {doctor.name}, {doctor.credentials}
        </Link>
        <p className="text-sm font-medium text-brand-600">{doctor.specialty}</p>
        <div className="mt-1.5">
          <StarRating rating={doctor.rating} count={doctor.reviewCount} />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
          <MapPin size={14} />
          <span>{doctor.address}{doctor.city ? `, ${doctor.city}` : ''}</span>
        </div>
        {doctor.acceptingNew && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-brand-600">
            <ShieldCheck size={14} />
            <span>Accepting new patients</span>
          </div>
        )}
        {(doctor.insurances.length > 0 || doctor.acceptsCash) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {doctor.acceptsCash && <MedicalAidPill name={CASH_LABEL} />}
            {doctor.insurances.slice(0, 3).map((ins) => (
              <MedicalAidPill key={ins} name={ins} />
            ))}
            {doctor.insurances.length > 3 && (
              <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">
                +{doctor.insurances.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:w-48">
        <div className="rounded-xl bg-brand-50 p-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-ink-500">
            <CalendarCheck2 size={13} /> Next available
          </p>
          <p className="mt-1 text-sm font-bold text-brand-700">
            {nextSlot ? `${nextSlot.day} at ${nextSlot.time}` : 'No openings'}
          </p>
        </div>
        <Link
          to={`/doctor/${doctor.id}`}
          className="rounded-full bg-accent-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          Book Appointment
        </Link>
      </div>
    </div>
  )
}
