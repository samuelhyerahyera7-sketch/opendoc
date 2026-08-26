import pool from './db.mjs'

export async function serializeDoctor(row, { includePrivate = false, distanceKm = null } = {}) {
  const [insurancesResult, slotsResult] = await Promise.all([
    pool.query('SELECT insurance FROM doctor_insurances WHERE doctor_id = $1 ORDER BY insurance', [row.id]),
    pool.query(
      `SELECT id, day_label, time_label, is_booked, slot_date FROM doctor_slots
       WHERE doctor_id = $1 AND is_booked = FALSE AND (slot_date IS NULL OR slot_date >= CURRENT_DATE)
       ORDER BY slot_date NULLS LAST, id`,
      [row.id],
    ),
  ])

  const out = {
    id: row.id,
    name: row.name,
    credentials: row.credentials,
    specialty: row.specialty,
    photo: row.photo,
    address: row.address,
    city: row.city,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
    bio: row.bio,
    education: row.education ?? [],
    languages: row.languages ?? [],
    acceptingNew: !!row.accepting_new,
    acceptsCash: !!row.accepts_cash,
    rating: row.rating,
    reviewCount: row.review_count,
    verificationStatus: row.verification_status || 'pending',
    insurances: insurancesResult.rows.map((r) => r.insurance),
    slots: slotsResult.rows.map((s) => ({
      id: s.id,
      day: s.day_label,
      time: s.time_label,
      date: s.slot_date ? s.slot_date.toISOString().slice(0, 10) : null,
    })),
  }

  if (includePrivate) {
    out.email = row.email
    out.hpcsaNumber = row.hpcsa_number
    out.emailVerified = !!row.email_verified
  }

  return out
}
