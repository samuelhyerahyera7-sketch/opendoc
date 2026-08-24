import crypto from 'node:crypto'
import pool from './db.mjs'
import { hashPassword } from './auth.mjs'
import { CITY_COORDS, jitterCoord } from './geo.mjs'

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

// Major South African medical schemes patients can filter by. "Cash /
// Self-pay" is not a scheme — it's tracked on the doctor record itself
// (accepts_cash) since almost every provider takes it — but it's listed
// here too so it always appears as the first, always-available filter
// option in the UI.
export const CASH_OPTION = 'Cash / Self-pay (no medical aid)'

export const medicalAidsList = [
  'Discovery Health Medical Scheme',
  'Bonitas Medical Fund',
  'Momentum Health',
  'Medshield Medical Scheme',
  'Bestmed Medical Scheme',
  'Fedhealth Medical Scheme',
  'Bankmed',
  'Profmed',
  'Polmed',
  'GEMS (Government Employees Medical Scheme)',
  'Sizwe Hosmed',
  'Keyhealth',
  'Suremed Health',
  'Medihelp',
]

export const insurancesList = [CASH_OPTION, ...medicalAidsList]

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

export async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM doctors')
  if (rows[0].count > 0) return

  const rand = seededRandom(42)
  const cities = ['Sandton, Johannesburg', 'Cape Town CBD', 'Rosebank, Johannesburg', 'Umhlanga, Durban', 'Pretoria East', 'Bellville, Cape Town']
  const days = ['Today', 'Tomorrow', 'Wed, Aug 26', 'Thu, Aug 27', 'Fri, Aug 28']
  let idx = 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const spec of specialtiesList) {
      for (let i = 0; i < 3; i++) {
        const [first, last] = names[idx % names.length]
        idx++
        const id = crypto.randomUUID()
        const rating = Math.round((4 + rand() * 1) * 10) / 10
        const reviewCount = Math.floor(20 + rand() * 480)
        const city = cities[idx % cities.length]
        const coord = jitterCoord(CITY_COORDS[city], 6, rand)
        const credentials =
          spec.name === 'Dentist' ? 'DDS' : spec.name === 'Psychiatrist' ? 'MD, Psychiatry' : spec.name === 'Physical Therapist' ? 'DPT' : 'MD'
        const education = [
          ['University of Cape Town Faculty of Health Sciences', 'University of the Witwatersrand', 'Stellenbosch University Faculty of Medicine and Health Sciences'][idx % 3],
          'Community service completed at a provincial hospital',
        ]
        const extraLang = ['Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho'][idx % 4]
        const languages = rand() > 0.4 ? ['English', extraLang] : ['English']

        await client.query(
          `INSERT INTO doctors
            (id, name, credentials, specialty, email, password_hash, photo, address, city, lat, lng, bio, education, languages, accepting_new, accepts_cash, rating, review_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          [
            id,
            `${first} ${last}`,
            credentials,
            spec.name,
            `${first}.${last}${idx}@opendoc-demo.com`.toLowerCase(),
            hashPassword('demopassword'),
            `https://i.pravatar.cc/300?img=${(idx % 70) + 1}`,
            `${100 + idx * 3} ${['Rivonia Rd', 'Main Rd', 'Church St', 'Long St', 'Florida Rd'][idx % 5]}, Suite ${(idx % 9) + 1}0${idx % 3}`,
            city,
            coord.lat,
            coord.lng,
            bios[idx % bios.length].replace('{name}', last),
            JSON.stringify(education),
            JSON.stringify(languages),
            rand() > 0.2,
            rand() > 0.1,
            rating,
            reviewCount,
          ],
        )

        for (const ins of medicalAidsList) {
          if (rand() > 0.55) {
            await client.query('INSERT INTO doctor_insurances (doctor_id, insurance) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, ins])
          }
        }

        for (const day of days) {
          const slotsForDay = 1 + Math.floor(rand() * 3)
          for (let s = 0; s < slotsForDay; s++) {
            const h = 8 + Math.floor(rand() * 9)
            const m = rand() > 0.5 ? '00' : '30'
            const ampm = h < 12 ? 'AM' : 'PM'
            const h12 = h > 12 ? h - 12 : h
            await client.query('INSERT INTO doctor_slots (doctor_id, day_label, time_label) VALUES ($1, $2, $3)', [id, day, `${h12}:${m} ${ampm}`])
          }
        }
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  console.log(`Seeded ${idx} demo doctors.`)
}
