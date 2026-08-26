import { Ban, CheckCircle2, Clock, XCircle } from 'lucide-react'

export default function VerificationBadge({ status }: { status: 'pending' | 'verified' | 'rejected' | 'suspended' }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        <CheckCircle2 size={13} /> HPCSA verified
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
        <XCircle size={13} /> Verification declined
      </span>
    )
  }
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
        <Ban size={13} /> Suspended
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
      <Clock size={13} /> Verification pending
    </span>
  )
}
