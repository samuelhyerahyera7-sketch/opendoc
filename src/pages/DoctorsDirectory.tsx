import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { metros } from '../data/metros'
import { specialtyIcons, slugifySpecialty } from '../data/staticData'

export default function DoctorsDirectory() {
  const specialties = Object.keys(specialtyIcons)

  return (
    <div className="bg-ink-50/60 flex-1">
      <Seo
        title="Browse Doctors by Specialty and City"
        description="Find doctors in South Africa by specialty and city — primary care, dermatology, dentistry, therapy, and more, across Johannesburg, Cape Town, Pretoria, Durban, and every major metro."
        path="/doctors"
      />
      <div className="border-b border-ink-100 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Browse doctors by specialty and city</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            Pick a specialty to see every city we cover, or jump straight to a specialty in your metro.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {specialties.map((specialty) => (
            <div key={specialty} className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                <span className="text-xl">{specialtyIcons[specialty]}</span>
                {specialty}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {metros.map((m) => (
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
          ))}
        </div>
      </div>
    </div>
  )
}
