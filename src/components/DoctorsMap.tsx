import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { ApiDoctor } from '../api/client'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export default function DoctorsMap({
  doctors,
  userLocation,
  onSelectDoctor,
}: {
  doctors: ApiDoctor[]
  userLocation?: { lat: number; lng: number }
  onSelectDoctor?: (doctorId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: userLocation ? [userLocation.lng, userLocation.lat] : [25, -29],
      zoom: userLocation ? 11 : 5,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const withCoords = doctors.filter((d) => d.lat !== null && d.lng !== null)
    const bounds = new mapboxgl.LngLatBounds()

    if (userLocation) {
      const el = document.createElement('div')
      el.className = 'h-4 w-4 rounded-full bg-accent-500 ring-4 ring-accent-200'
      new mapboxgl.Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map)
      bounds.extend([userLocation.lng, userLocation.lat])
    }

    withCoords.forEach((d) => {
      const el = document.createElement('button')
      el.className =
        'flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-xs font-bold text-white shadow-md cursor-pointer'
      el.textContent = d.name.split(' ').map((p) => p[0]).slice(0, 2).join('')
      el.title = `${d.name}, ${d.credentials}`
      el.onclick = () => onSelectDoctor?.(d.id)

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(
        `<div style="font-family:inherit;min-width:160px">
          <div style="font-weight:700;font-size:13px;color:#232733">${d.name}, ${d.credentials}</div>
          <div style="font-size:12px;color:#67748c">${d.specialty}</div>
          ${d.distanceKm !== null ? `<div style="font-size:12px;color:#1fa898;font-weight:600;margin-top:2px">${d.distanceKm.toFixed(1)} km away</div>` : ''}
        </div>`,
      )

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([d.lng as number, d.lat as number])
        .setPopup(popup)
        .addTo(map)
      markersRef.current.push(marker)
      bounds.extend([d.lng as number, d.lat as number])
    })

    if (!bounds.isEmpty() && (withCoords.length > 0 || userLocation)) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
    }
  }, [doctors, userLocation, onSelectDoctor])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-8 text-center text-sm text-ink-500">
        Map view isn't configured for this deployment.
      </div>
    )
  }

  return <div ref={containerRef} className="h-full min-h-[400px] w-full rounded-2xl" />
}
