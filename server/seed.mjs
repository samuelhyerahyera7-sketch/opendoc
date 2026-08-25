import crypto from 'node:crypto'
import pool from './db.mjs'
import { hashPassword } from './auth.mjs'
import { CITY_COORDS, jitterCoord } from './geo.mjs'

export const specialtiesList = [
  { name: 'Primary Care', icon: '🩺' },
  { name: 'Dermatologist', icon: '🧴' },
  { name: 'Dentist', icon: '🦷' },
  { name: 'OB-GYN', icon: '🤰' },
  { name: 'Therapist', icon: '🛋️' },
  { name: 'Eye Doctor', icon: '👁️' },
  { name: 'Chiropractor', icon: '💆' },
  { name: 'Psychiatrist', icon: '🩹' },
  { name: 'Physical Therapist', icon: '🏃' },
  { name: 'ENT Specialist', icon: '👂' },
  { name: 'Cardiologist', icon: '❤️' },
  { name: 'Orthopedic Surgeon', icon: '🦴' },
  { name: 'Paediatrician', icon: '🧸' },
  { name: 'General Surgeon', icon: '🔪' },
  { name: 'Urologist', icon: '🚻' },
  { name: 'Gastroenterologist', icon: '🍽️' },
  { name: 'Neurologist', icon: '🧠' },
  { name: 'Pulmonologist', icon: '🫁' },
  { name: 'Endocrinologist', icon: '🧪' },
  { name: 'Nephrologist', icon: '🫘' },
  { name: 'Oncologist', icon: '🎗️' },
  { name: 'Rheumatologist', icon: '🦵' },
  { name: 'Radiologist', icon: '🩻' },
  { name: 'Anaesthesiologist', icon: '💉' },
  { name: 'Plastic Surgeon', icon: '✨' },
  { name: 'Vascular Surgeon', icon: '🩸' },
  { name: 'Audiologist', icon: '🎧' },
  { name: 'Podiatrist', icon: '🦶' },
  { name: 'Dietitian', icon: '🥗' },
  { name: 'Occupational Therapist', icon: '🖐️' },
  { name: 'Speech Therapist', icon: '🗣️' },
  { name: 'Optometrist', icon: '👓' },
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

const reviewerNames = [
  'Thabo M.', 'Nomsa D.', 'Werner P.', 'Fatima K.', 'Sipho N.', 'Annelie B.',
  'Katlego S.', 'Ronel V.', 'Lindiwe Z.', 'Pieter J.', 'Zanele T.', 'Riaan C.',
  'Palesa R.', 'Hendrik O.', 'Bongani F.', 'Chantal L.',
]

const reviewComments = [
  'Very thorough and took the time to answer all of my questions.',
  'Front desk was friendly and the wait was short. Would recommend.',
  'Professional and explained everything clearly before proceeding.',
  'My medical aid claim went through without any hassle.',
  'Got an appointment the same week, which I did not expect.',
  'Good bedside manner and did not feel rushed at all.',
  'Consultation room was clean and the whole visit felt organised.',
  'Explained the treatment plan in plain language, which I appreciated.',
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

        // Plausible-looking HPCSA-style registration number for demo doctors.
        // Real HPCSA numbers aren't verifiable through a public API, so these
        // seeded doctors are marked "verified" as pre-approved directory
        // listings — anyone who registers for real starts at "pending"
        // until an admin reviews their actual number (see /admin).
        const hpcsaPrefix = spec.name === 'Dentist' ? 'DE' : spec.name === 'Physical Therapist' ? 'PT' : spec.name === 'Psychiatrist' || spec.name === 'Primary Care' ? 'MP' : 'MP'
        const hpcsaNumber = `${hpcsaPrefix}${100000 + idx * 37}`

        await client.query(
          `INSERT INTO doctors
            (id, name, credentials, specialty, email, password_hash, photo, address, city, lat, lng, bio, education, languages, accepting_new, accepts_cash, hpcsa_number, verification_status, email_verified)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'verified',TRUE)`,
          [
            id,
            `${first} ${last}`,
            credentials,
            spec.name,
            `${first}.${last}${idx}@opendoc-demo.com`.toLowerCase(),
            hashPassword('demopassword'),
            `https://i.pravatar.cc/300?img=${(idx % 70) + 1}`,
            `${100 + idx * 3} ${['Rivonia Rd', 'Main Rd', 'Church St', 'Long St', 'Florida Rd'][idx % 5]}, Unit ${(idx % 9) + 1}0${idx % 3}`,
            city,
            coord.lat,
            coord.lng,
            bios[idx % bios.length].replace('{name}', last),
            JSON.stringify(education),
            JSON.stringify(languages),
            rand() > 0.2,
            rand() > 0.1,
            hpcsaNumber,
          ],
        )

        // A handful of real reviews per doctor (varied reviewer/comment per
        // doctor, not the same three names repeated everywhere) anchored to
        // synthetic completed appointments, so doctors.rating/review_count
        // below is a true aggregate rather than a fabricated number.
        const reviewTotal = 3 + Math.floor(rand() * 5)
        let ratingSum = 0
        for (let r = 0; r < reviewTotal; r++) {
          const apptId = crypto.randomUUID()
          const reviewerIdx = Math.floor(rand() * reviewerNames.length)
          const reviewer = reviewerNames[(reviewerIdx + r) % reviewerNames.length]
          const comment = reviewComments[Math.floor(rand() * reviewComments.length)]
          const stars = rand() > 0.15 ? 5 : 4
          ratingSum += stars
          await client.query(
            `INSERT INTO appointments
              (id, doctor_id, patient_first_name, patient_last_name, patient_email, patient_phone, day_label, time_label, status)
             VALUES ($1,$2,$3,$4,$5,$6,'Past','—','completed')`,
            [apptId, id, reviewer.split(' ')[0], reviewer.split(' ')[1] || '', 'demo@opendoc-demo.com', '000', ],
          )
          await client.query(
            'INSERT INTO reviews (id, appointment_id, doctor_id, patient_name, rating, comment) VALUES ($1,$2,$3,$4,$5,$6)',
            [crypto.randomUUID(), apptId, id, reviewer, stars, comment],
          )
        }
        await client.query('UPDATE doctors SET rating = $1, review_count = $2 WHERE id = $3', [
          Math.round((ratingSum / reviewTotal) * 10) / 10,
          reviewTotal,
          id,
        ])

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
