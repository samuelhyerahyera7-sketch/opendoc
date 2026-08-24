// Real coordinates for the areas doctors are seeded in (and that patients
// can search near) — plain geographic facts, not anyone's proprietary data.
export const CITY_COORDS = {
  'Sandton, Johannesburg': { lat: -26.1076, lng: 28.0567 },
  'Cape Town CBD': { lat: -33.9249, lng: 18.4241 },
  'Rosebank, Johannesburg': { lat: -26.1462, lng: 28.0436 },
  'Umhlanga, Durban': { lat: -29.7268, lng: 31.0844 },
  'Pretoria East': { lat: -25.783, lng: 28.277 },
  'Bellville, Cape Town': { lat: -33.9, lng: 18.6292 },
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Spreads seeded doctors around a city center instead of stacking them on
// one point, so distance sort/filtering has something real to work with.
export function jitterCoord(center, kmRadius, rand) {
  const dLat = ((rand() - 0.5) * 2 * kmRadius) / 111
  const dLng = ((rand() - 0.5) * 2 * kmRadius) / (111 * Math.cos((center.lat * Math.PI) / 180))
  return { lat: center.lat + dLat, lng: center.lng + dLng }
}
