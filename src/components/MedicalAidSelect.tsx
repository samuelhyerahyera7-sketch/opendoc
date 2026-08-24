import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
        <div className="absolute z-20 mt-1.5 max-h-72 w-full min-w-[260px] overflow-auto rounded-xl border border-ink-100 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${!value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-ink-50'}`}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
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
        </div>
      )}
    </div>
  )
}
