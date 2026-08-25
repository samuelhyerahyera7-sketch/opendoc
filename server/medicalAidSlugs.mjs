// Mirrors src/data/medicalAids.ts's slugifyMedicalAid — kept in sync
// manually since the server and client don't share a module today.
export function slugifyMedicalAid(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
