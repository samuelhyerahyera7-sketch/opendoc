// Real coordinates for major South African cities/suburbs, used to power
// "near me" search without needing a live geocoding API.
export type SALocation = { name: string; lat: number; lng: number }

export const saLocations: SALocation[] = [
  { name: 'Sandton, Johannesburg', lat: -26.1076, lng: 28.0567 },
  { name: 'Johannesburg CBD', lat: -26.2041, lng: 28.0473 },
  { name: 'Rosebank, Johannesburg', lat: -26.1462, lng: 28.0436 },
  { name: 'Randburg, Johannesburg', lat: -26.094, lng: 27.9761 },
  { name: 'Pretoria CBD', lat: -25.7479, lng: 28.2293 },
  { name: 'Pretoria East', lat: -25.783, lng: 28.277 },
  { name: 'Centurion', lat: -25.8603, lng: 28.1894 },
  { name: 'Cape Town CBD', lat: -33.9249, lng: 18.4241 },
  { name: 'Sea Point, Cape Town', lat: -33.915, lng: 18.385 },
  { name: 'Bellville, Cape Town', lat: -33.9, lng: 18.6292 },
  { name: 'Stellenbosch', lat: -33.9321, lng: 18.8602 },
  { name: 'Camps Bay, Cape Town', lat: -33.95, lng: 18.3775 },
  { name: 'Durban CBD', lat: -29.8587, lng: 31.0218 },
  { name: 'Umhlanga, Durban', lat: -29.7268, lng: 31.0844 },
  { name: 'Ballito', lat: -29.5389, lng: 31.2141 },
  { name: 'Gqeberha (Port Elizabeth)', lat: -33.9608, lng: 25.6022 },
  { name: 'East London', lat: -33.0153, lng: 27.9116 },
  { name: 'Bloemfontein', lat: -29.0852, lng: 26.1596 },
  { name: 'Polokwane', lat: -23.9045, lng: 29.4689 },
  { name: 'Nelspruit (Mbombela)', lat: -25.4753, lng: 30.9694 },
  { name: 'Kimberley', lat: -28.7282, lng: 24.7499 },
  { name: 'George', lat: -33.963, lng: 22.4617 },
]

export function findLocationByName(name: string): SALocation | undefined {
  const q = name.trim().toLowerCase()
  if (!q) return undefined
  return (
    saLocations.find((l) => l.name.toLowerCase() === q) ??
    saLocations.find((l) => l.name.toLowerCase().startsWith(q))
  )
}

export function searchLocations(query: string, limit = 6): SALocation[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return saLocations.filter((l) => l.name.toLowerCase().includes(q)).slice(0, limit)
}
