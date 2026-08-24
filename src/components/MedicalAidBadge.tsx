import { CASH_LABEL, CASH_VISUAL, getMedicalAidVisual } from '../data/medicalAids'

const sizeClasses = {
  sm: 'h-5 w-5 text-[9px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export default function MedicalAidLogo({ name, size = 'md' }: { name: string; size?: keyof typeof sizeClasses }) {
  const visual = name === CASH_LABEL ? CASH_VISUAL : getMedicalAidVisual(name)
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-md font-bold ${sizeClasses[size]}`}
      style={{ backgroundColor: visual.bg, color: visual.fg }}
    >
      {visual.code}
    </span>
  )
}

export function MedicalAidPill({ name, tone = 'neutral' }: { name: string; tone?: 'neutral' | 'accent' }) {
  const isCash = name === CASH_LABEL
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-medium ${
        tone === 'accent' || isCash ? 'bg-accent-50 text-accent-700' : 'bg-ink-100 text-ink-700'
      }`}
    >
      <MedicalAidLogo name={name} size="sm" />
      {isCash ? 'Cash / Self-pay' : name}
    </span>
  )
}
