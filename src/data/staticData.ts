// Reference UI data (icons/labels) that mirrors the specialty list seeded on
// the server. Actual doctor records always come from the API.
export const specialtyIcons: Record<string, string> = {
  'Primary Care': '🩺',
  Dermatologist: '🧴',
  Dentist: '🦷',
  'OB-GYN': '🤰',
  Therapist: '🧠',
  'Eye Doctor': '👁️',
  Chiropractor: '💆',
  Psychiatrist: '🩹',
  'Physical Therapist': '🏃',
  'ENT Specialist': '👂',
  Cardiologist: '❤️',
  'Orthopedic Surgeon': '🦴',
}

export function slugifySpecialty(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function findSpecialtyBySlug(slug: string): string | undefined {
  return Object.keys(specialtyIcons).find((name) => slugifySpecialty(name) === slug)
}

// Mirrors the medical aid schemes seeded on the server — used for static
// links (e.g. the footer) that shouldn't need a network round trip just to
// render. The live, doctor-count-backed list comes from the API.
export const footerMedicalAids = [
  'Discovery Health Medical Scheme',
  'Bonitas Medical Fund',
  'Fedhealth Medical Scheme',
  'Momentum Health',
  'Bestmed Medical Scheme',
]
