// Real address geocoding via Mapbox, restricted to South Africa. Falls back
// to nothing (an empty list) when no token is configured, so the app still
// works without it — the static SA location list keeps working either way.
export type GeocodeResult = { name: string; lat: number; lng: number }

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export async function geocodeSearch(query: string, limit = 5): Promise<GeocodeResult[]> {
  if (!MAPBOX_TOKEN || query.trim().length < 3) return []
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=za&limit=${limit}&types=address,place,locality,neighborhood,postcode`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || []).map((f: { place_name: string; center: [number, number] }) => ({
      name: f.place_name.replace(/, South Africa$/, ''),
      lng: f.center[0],
      lat: f.center[1],
    }))
  } catch {
    return []
  }
}
