// Visual identity for each medical aid scheme shown on the site: a short
// monogram + a distinct color, generated rather than copied from any real
// scheme's branding (we don't have rights to reproduce their logos).
export type MedicalAidVisual = { code: string; bg: string; fg: string }

const palette = [
  { bg: '#0f766e', fg: '#ffffff' }, // teal
  { bg: '#7c3aed', fg: '#ffffff' }, // violet
  { bg: '#be123c', fg: '#ffffff' }, // rose
  { bg: '#b45309', fg: '#ffffff' }, // amber
  { bg: '#1d4ed8', fg: '#ffffff' }, // blue
  { bg: '#15803d', fg: '#ffffff' }, // green
  { bg: '#a21caf', fg: '#ffffff' }, // fuchsia
  { bg: '#0369a1', fg: '#ffffff' }, // sky
  { bg: '#c2410c', fg: '#ffffff' }, // orange
  { bg: '#4338ca', fg: '#ffffff' }, // indigo
  { bg: '#0d9488', fg: '#ffffff' }, // teal-alt
  { bg: '#9f1239', fg: '#ffffff' }, // crimson
  { bg: '#166534', fg: '#ffffff' }, // forest
  { bg: '#6d28d9', fg: '#ffffff' }, // purple
]

function monogram(name: string): string {
  const letters = name.match(/\b[A-Z]/g) ?? []
  if (letters.length >= 2) return letters.slice(0, 2).join('')
  return name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
}

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

const cache = new Map<string, MedicalAidVisual>()

export function getMedicalAidVisual(name: string): MedicalAidVisual {
  if (cache.has(name)) return cache.get(name)!
  const color = palette[hashString(name) % palette.length]
  const visual = { code: monogram(name), ...color }
  cache.set(name, visual)
  return visual
}

export const CASH_VISUAL: MedicalAidVisual = { code: 'R', bg: '#ea580c', fg: '#ffffff' }
export const CASH_LABEL = 'Cash / Self-pay (no medical aid)'
