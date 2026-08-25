import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import MedicalAidLogo from './MedicalAidBadge'
import { CASH_LABEL } from '../data/medicalAids'

export default function MedicalAidSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      inputRef.current?.focus()
    }
  }, [open])

  const filteredOptions = options.filter((opt) => opt.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-sm text-ink-700 outline-none focus:border-brand-400"
      >
        <span className="flex items-center gap-2 truncate">
          {value && <MedicalAidLogo name={value} size="sm" />}
          <span className="truncate">{value ? (value === CASH_LABEL ? 'Cash / Self-pay' : value) : placeholder}</span>
        </span>
        <ChevronDown size={15} className="shrink-0 text-ink-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full min-w-[260px] overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-ink-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full border-0 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
            />
          </div>
          <div className="max-h-64 overflow-auto p-1.5">
            {!query && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${!value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-ink-50'}`}
              >
                {placeholder}
              </button>
            )}
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                  value === opt ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                <MedicalAidLogo name={opt} size="sm" />
                <span className="truncate">{opt === CASH_LABEL ? 'Cash / Self-pay' : opt}</span>
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <p className="px-2.5 py-4 text-center text-xs text-ink-400">No medical aid matches "{query}".</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
