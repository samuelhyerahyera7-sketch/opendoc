import crypto from 'node:crypto'
import db from './db.mjs'
import { hashPassword } from './auth.mjs'

export const specialtiesList = [
  { name: 'Primary Care', icon: '🩺' },
  { name: 'Dermatologist', icon: '🧴' },
  { name: 'Dentist', icon: '🦷' },
  { name: 'OB-GYN', icon: '🤰' },
  { name: 'Therapist', icon: '🧠' },
  { name: 'Eye Doctor', icon: '👁️' },
  { name: 'Chiropractor', icon: '💆' },
  { name: 'Psychiatrist', icon: '🩹' },
  { name: 'Physical Therapist', icon: '🏃' },
  { name: 'ENT Specialist', icon: '👂' },
  { name: 'Cardiologist', icon: '❤️' },
  { name: 'Orthopedic Surgeon', icon: '🦴' },
]

export const insurancesList = [
  'Aetna',
  'Cigna',
  'UnitedHealthcare',
  'Blue Cross Blue Shield',
  'Humana',
  'Medicare',
  'Medicaid',
  'Discovery Health',
  'Bonitas',
  'Momentum Health',
]

const names = [
  ['Sarah', 'Kim'], ['James', 'Whitfield'], ['Maria', 'Gonzalez'], ['David', 'Chen'],
  ['Emily', 'Turner'], ['Robert', 'Osei'], ['Aisha', 'Rahman'], ['Michael', 'Petrov'],
  ['Lauren', 'Brooks'], ['Daniel', 'Nguyen'], ['Olivia', 'Martin'], ['Samuel', 'Adeyemi'],
]

const bios = [
  'Dr. {name} takes a patient-first approach, focusing on preventive care and long-term wellness plans tailored to each individual.',
  'With over a decade of experience, Dr. {name} is known for a warm bedside manner and thorough, unhurried appointments.',
  'Dr. {name} specializes in evidence-based treatment and works closely with patients to build care plans that fit their lives.',
  'Board-certified and highly reviewed, Dr. {name} focuses on clear communication and modern, minimally invasive techniques.',
]

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const insertDoctor = db.prepare(`
  INSERT INTO doctors
    (id, name, credentials, specialty, email, password_hash, photo, address, city, bio, education, languages, accepting_new, rating, review_count)
  VALUES (@id, @name, @credentials, @specialty, @email, @password_hash, @photo, @address, @city, @bio, @education, @languages, @accepting_new, @rating, @review_count)
`)
const insertInsurance = db.prepare('INSERT OR IGNORE INTO doctor_insurances (doctor_id, insurance) VALUES (?, ?)')
const insertSlot = db.prepare('INSERT INTO doctor_slots (doctor_id, day_label, time_label) VALUES (?, ?, ?)')

export function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM doctors').get()
  if (count > 0) return

  const rand = seededRandom(42)
  const cities = ['New York, NY', 'Brooklyn, NY', 'Jersey City, NJ', 'Queens, NY']
  const days = ['Today', 'Tomorrow', 'Wed, Aug 26', 'Thu, Aug 27', 'Fri, Aug 28']
  let idx = 0

  db.exec('BEGIN')
  try {
    for (const spec of specialtiesList) {
      for (let i = 0; i < 3; i++) {
        const [first, last] = names[idx % names.length]
        idx++
        const id = crypto.randomUUID()
        const rating = Math.round((4 + rand() * 1) * 10) / 10
        const reviewCount = Math.floor(20 + rand() * 480)

        insertDoctor.run({
          id,
          name: `${first} ${last}`,
          credentials: spec.name === 'Dentist' ? 'DDS' : spec.name === 'Psychiatrist' ? 'MD, Psychiatry' : spec.name === 'Physical Therapist' ? 'DPT' : 'MD',
          specialty: spec.name,
          email: `${first}.${last}${idx}@opendoc-demo.com`.toLowerCase(),
          password_hash: hashPassword('demopassword'),
          photo: `https://i.pravatar.cc/300?img=${(idx % 70) + 1}`,
          address: `${100 + idx * 3} ${['Park Ave', 'Broadway', 'Main St', '5th Ave', 'Court St'][idx % 5]}, Suite ${(idx % 9) + 1}0${idx % 3}`,
          city: cities[idx % cities.length],
          bio: bios[idx % bios.length].replace('{name}', last),
          education: JSON.stringify(['Johns Hopkins University School of Medicine', 'Residency at NYU Langone Health']),
          languages: JSON.stringify(rand() > 0.5 ? ['English', 'Spanish'] : ['English']),
          accepting_new: rand() > 0.2 ? 1 : 0,
          rating,
          review_count: reviewCount,
        })

        for (const ins of insurancesList) {
          if (rand() > 0.45) insertInsurance.run(id, ins)
        }

        for (const day of days) {
          const slotsForDay = 1 + Math.floor(rand() * 3)
          for (let s = 0; s < slotsForDay; s++) {
            const h = 8 + Math.floor(rand() * 9)
            const m = rand() > 0.5 ? '00' : '30'
            const ampm = h < 12 ? 'AM' : 'PM'
            const h12 = h > 12 ? h - 12 : h
            insertSlot.run(id, day, `${h12}:${m} ${ampm}`)
          }
        }
      }
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  console.log(`Seeded ${idx} demo doctors.`)
}
