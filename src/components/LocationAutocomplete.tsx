import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { searchLocations, type SALocation } from '../data/saLocations'
import { geocodeSearch, type GeocodeResult } from '../lib/mapbox'

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a city, town, or address…',
  required,
}: {
  value: string
  onChange: (name: string, location?: SALocation | GeocodeResult) => void
  placeholder?: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const localSuggestions = searchLocations(value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      geocodeSearch(value).then(setAddressResults)
    }, 300)
    return () => clearTimeout(handle)
  }, [value])

  const localNames = new Set(localSuggestions.map((l) => l.name.toLowerCase()))
  const addressSuggestions = addressResults.filter((r) => !localNames.has(r.name.toLowerCase()))

  return (
    <div ref={wrapRef} className="relative">
      <input
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
      />
      {open && (localSuggestions.length > 0 || addressSuggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-ink-100 bg-white text-left shadow-lg">
          {localSuggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                onChange(s.name, s)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-brand-50"
            >
              <MapPin size={14} className="shrink-0 text-ink-400" />
              <span>
                {s.name}
                <span className="ml-1.5 text-xs text-ink-400">{s.province}{s.isMetro ? ' · metro' : ''}</span>
              </span>
            </button>
          ))}
          {addressSuggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                onChange(s.name, s)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-brand-50"
            >
              <MapPin size={14} className="shrink-0 text-ink-400" />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
