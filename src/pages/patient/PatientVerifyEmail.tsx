import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { api } from '../../api/client'

export default function PatientVerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    api.verifyPatientEmail(token).then(() => setStatus('ok')).catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      {status === 'loading' && <Loader2 size={32} className="animate-spin text-ink-400" />}
      {status === 'ok' && (
        <>
          <CheckCircle2 size={40} className="text-brand-500" />
          <h1 className="mt-4 text-2xl font-bold text-ink-900">Email verified</h1>
          <p className="mt-2 text-ink-500">Your email is now confirmed.</p>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={40} className="text-accent-600" />
          <h1 className="mt-4 text-2xl font-bold text-ink-900">Link invalid or expired</h1>
          <p className="mt-2 text-ink-500">Request a new verification email from your account.</p>
        </>
      )}
      <Link to="/patient/dashboard" className="mt-6 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        Go to my account
      </Link>
    </div>
  )
}
