import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crosshair, Loader2, MapPin, Search, Stethoscope } from 'lucide-react'
import { findLocationByName, searchLocations, type SALocation } from '../data/saLocations'
import { geocodeSearch, type GeocodeResult } from '../lib/mapbox'
import { specialtyIcons } from '../data/staticData'
import { api, type ApiDoctor } from '../api/client'

export default function SearchBar({
  initialQuery = '',
  initialLocation = '',
  initialLat,
  initialLng,
}: {
  initialQuery?: string
  initialLocation?: string
  initialLat?: number
  initialLng?: number
}) {
  const [query, setQuery] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(
    initialLat !== undefined && initialLng !== undefined ? { lat: initialLat, lng: initialLng } : undefined,
  )
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([])
  const [queryOpen, setQueryOpen] = useState(false)
  const [doctorMatches, setDoctorMatches] = useState<ApiDoctor[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const queryWrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setSuggestionsOpen(false)
      if (queryWrapRef.current && !queryWrapRef.current.contains(e.target as Node)) setQueryOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      geocodeSearch(location).then(setAddressResults)
    }, 300)
    return () => clearTimeout(handle)
  }, [location])

  useEffect(() => {
    if (query.trim().length < 2) {
      setDoctorMatches([])
      return
    }
    const handle = setTimeout(() => {
      api.searchDoctors({ q: query }).then((docs) => setDoctorMatches(docs.slice(0, 5))).catch(() => {})
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  const localSuggestions = searchLocations(location)
  const localNames = new Set(localSuggestions.map((l) => l.name.toLowerCase()))
  const addressSuggestions = addressResults.filter((r) => !localNames.has(r.name.toLowerCase()))
  const suggestions: (SALocation | GeocodeResult)[] = [...localSuggestions, ...addressSuggestions]

  const specialtyMatches = query.trim().length > 0
    ? Object.keys(specialtyIcons).filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
    : []

  function pickSuggestion(name: string, lat: number, lng: number) {
    setLocation(name)
    setCoords({ lat, lng })
    setSuggestionsOpen(false)
  }

  function handleLocationChange(value: string) {
    setLocation(value)
    setCoords(undefined)
    setSuggestionsOpen(true)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Location services are not available in this browser.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocation('Current location')
        setLocating(false)
        setSuggestionsOpen(false)
      },
      () => {
        setGeoError("Couldn't get your location — check permissions and try again.")
        setLocating(false)
      },
      { timeout: 10000 },
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const resolved = coords ?? findLocationByName(location)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (location) params.set('loc', location)
    if (resolved) {
      params.set('lat', String(resolved.lat))
      params.set('lng', String(resolved.lng))
    }
    navigate(`/search?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col overflow-visible rounded-2xl bg-white shadow-xl shadow-ink-900/10 ring-1 ring-ink-100 sm:flex-row sm:rounded-full"
    >
      <div ref={queryWrapRef} className="relative flex flex-1 items-center gap-3 px-5 py-4">
        <Search size={20} className="shrink-0 text-ink-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setQueryOpen(true) }}
          onFocus={() => setQueryOpen(true)}
          placeholder="Doctor's name, specialty, or condition"
          className="w-full border-0 text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
          autoComplete="off"
        />

        {queryOpen && (specialtyMatches.length > 0 || doctorMatches.length > 0) && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-ink-100 bg-white text-left shadow-lg">
            {specialtyMatches.length > 0 && (
              <div className="border-b border-ink-50 py-1.5">
                {specialtyMatches.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setQuery(s); setQueryOpen(false) }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-brand-50"
                  >
                    <span className="text-base leading-none">{specialtyIcons[s]}</span>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {doctorMatches.length > 0 && (
              <div className="py-1.5">
                {doctorMatches.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setQueryOpen(false); navigate(`/doctor/${d.id}`) }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-brand-50"
                  >
                    <Stethoscope size={14} className="shrink-0 text-ink-400" />
                    <span>
                      <span className="font-semibold text-ink-900">{d.name}, {d.credentials}</span>{' '}
                      <span className="text-ink-500">— {d.specialty}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="hidden w-px bg-ink-100 sm:block" />
      <div ref={wrapRef} className="relative flex flex-1 items-center gap-3 border-t border-ink-100 px-5 py-4 sm:border-t-0">
        <MapPin size={20} className="shrink-0 text-ink-400" />
        <input
          value={location}
          onChange={(e) => handleLocationChange(e.target.value)}
          onFocus={() => setSuggestionsOpen(true)}
          placeholder="Location"
          className="w-full border-0 text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
        />
        <button
          type="button"
          onClick={useMyLocation}
          title="Use my current location"
          className="shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600"
        >
          {locating ? <Loader2 size={17} className="animate-spin" /> : <Crosshair size={17} />}
        </button>

        {suggestionsOpen && (suggestions.length > 0 || geoError) && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-ink-100 bg-white text-left shadow-lg">
            {geoError && <p className="px-4 py-2 text-xs text-accent-600">{geoError}</p>}
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => pickSuggestion(s.name, s.lat, s.lng)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-brand-50"
              >
                <MapPin size={14} className="text-ink-400" />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="submit"
        className="m-2 flex items-center justify-center gap-2 rounded-full bg-accent-500 px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-600"
      >
        <Search size={18} />
        Search
      </button>
    </form>
  )
}
