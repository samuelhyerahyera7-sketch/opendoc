import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { searchLocations, type SALocation } from '../data/saLocations'

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a city or town…',
  required,
}: {
  value: string
  onChange: (name: string, location?: SALocation) => void
  placeholder?: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const suggestions = searchLocations(value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-ink-100 bg-white text-left shadow-lg">
          {suggestions.map((s) => (
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
        </div>
      )}
    </div>
  )
}
