import db from './db.mjs'

export function serializeDoctor(row, { includePrivate = false } = {}) {
  const insurances = db
    .prepare('SELECT insurance FROM doctor_insurances WHERE doctor_id = ? ORDER BY insurance')
    .all(row.id)
    .map((r) => r.insurance)

  const slots = db
    .prepare('SELECT id, day_label, time_label, is_booked FROM doctor_slots WHERE doctor_id = ? AND is_booked = 0 ORDER BY id')
    .all(row.id)

  const out = {
    id: row.id,
    name: row.name,
    credentials: row.credentials,
    specialty: row.specialty,
    photo: row.photo,
    address: row.address,
    city: row.city,
    bio: row.bio,
    education: row.education ? JSON.parse(row.education) : [],
    languages: row.languages ? JSON.parse(row.languages) : [],
    acceptingNew: !!row.accepting_new,
    rating: row.rating,
    reviewCount: row.review_count,
    insurances,
    slots: slots.map((s) => ({ id: s.id, day: s.day_label, time: s.time_label })),
  }

  if (includePrivate) {
    out.email = row.email
  }

  return out
}
