export type Doctor = {
  id: string
  name: string
  credentials: string
  specialty: string
  photo: string
  rating: number
  reviewCount: number
  distance: string
  address: string
  city: string
  acceptingNew: boolean
  insurances: string[]
  nextAvailable: string
  slots: string[]
  bio: string
  education: string[]
  languages: string[]
}

export const specialties = [
  { name: 'Primary Care', icon: '🩺' },
  { name: 'Dermatologist', icon: '🧴' },
  { name: 'Dentist', icon: '🦷' },
  { name: "OB-GYN", icon: '🤰' },
  { name: 'Therapist', icon: '🧠' },
  { name: 'Eye Doctor', icon: '👁️' },
  { name: 'Chiropractor', icon: '💆' },
  { name: 'Psychiatrist', icon: '🩹' },
  { name: 'Physical Therapist', icon: '🏃' },
  { name: 'ENT Specialist', icon: '👂' },
  { name: 'Cardiologist', icon: '❤️' },
  { name: 'Orthopedic Surgeon', icon: '🦴' },
]

export const insurances = [
  'Aetna',
  'Cigna',
  'UnitedHealthcare',
  'Blue Cross Blue Shield',
  'Humana',
  'Medicare',
  'Medicaid',
  'Kaiser Permanente',
]

const names = [
  ['Sarah', 'Kim'],
  ['James', 'Whitfield'],
  ['Maria', 'Gonzalez'],
  ['David', 'Chen'],
  ['Emily', 'Turner'],
  ['Robert', 'Osei'],
  ['Aisha', 'Rahman'],
  ['Michael', 'Petrov'],
  ['Lauren', 'Brooks'],
  ['Daniel', 'Nguyen'],
  ['Olivia', 'Martin'],
  ['Samuel', 'Adeyemi'],
]

const bios = [
  'Dr. {name} takes a patient-first approach, focusing on preventive care and long-term wellness plans tailored to each individual.',
  'With over a decade of experience, Dr. {name} is known for a warm bedside manner and thorough, unhurried appointments.',
  'Dr. {name} specializes in evidence-based treatment and works closely with patients to build care plans that fit their lives.',
  'Board-certified and highly reviewed, Dr. {name} focuses on clear communication and modern, minimally invasive techniques.',
]

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function buildDoctors(): Doctor[] {
  const rand = seededRandom(42)
  const cities = ['New York, NY', 'Brooklyn, NY', 'Jersey City, NJ', 'Queens, NY']
  const doctors: Doctor[] = []
  let idx = 0
  for (const spec of specialties) {
    for (let i = 0; i < 3; i++) {
      const [first, last] = names[idx % names.length]
      idx++
      const rating = Math.round((4 + rand() * 1) * 10) / 10
      const reviewCount = Math.floor(20 + rand() * 480)
      const distanceMi = Math.round((0.3 + rand() * 6) * 10) / 10
      const day = Math.floor(rand() * 3)
      const dayLabel = day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : 'Thu, Aug 27'
      doctors.push({
        id: `${spec.name.toLowerCase().replace(/[^a-z]+/g, '-')}-${idx}`,
        name: `${first} ${last}`,
        credentials: spec.name === 'Dentist' ? 'DDS' : spec.name === 'Psychiatrist' ? 'MD, Psychiatry' : spec.name === 'Physical Therapist' ? 'DPT' : 'MD',
        specialty: spec.name,
        photo: `https://i.pravatar.cc/300?img=${(idx % 70) + 1}`,
        rating,
        reviewCount,
        distance: `${distanceMi} mi`,
        address: `${100 + idx * 3} ${['Park Ave', 'Broadway', 'Main St', '5th Ave', 'Court St'][idx % 5]}, Suite ${idx % 9 + 1}0${idx % 3}`,
        city: cities[idx % cities.length],
        acceptingNew: rand() > 0.2,
        insurances: insurances.filter(() => rand() > 0.4),
        nextAvailable: `${dayLabel} at ${8 + Math.floor(rand() * 9)}:${rand() > 0.5 ? '00' : '30'} ${rand() > 0.5 ? 'AM' : 'PM'}`,
        slots: Array.from({ length: 6 }).map(() => {
          const h = 8 + Math.floor(rand() * 9)
          const m = rand() > 0.5 ? '00' : '30'
          const ampm = h < 12 ? 'AM' : 'PM'
          const h12 = h > 12 ? h - 12 : h
          return `${h12}:${m} ${ampm}`
        }),
        bio: bios[idx % bios.length].replace('{name}', last),
        education: ['Johns Hopkins University School of Medicine', 'Residency at NYU Langone Health'],
        languages: rand() > 0.5 ? ['English', 'Spanish'] : ['English'],
      })
    }
  }
  return doctors
}

export const doctors = buildDoctors()

export function getDoctorById(id: string) {
  return doctors.find((d) => d.id === id)
}

export function searchDoctors(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return doctors
  return doctors.filter(
    (d) =>
      d.specialty.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q),
  )
}
