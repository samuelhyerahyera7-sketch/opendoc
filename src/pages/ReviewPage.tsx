import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Star } from 'lucide-react'
import { api, ApiError } from '../api/client'

export default function ReviewPage() {
  const { token } = useParams()
  const [target, setTarget] = useState<Awaited<ReturnType<typeof api.getReviewTarget>> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    api.getReviewTarget(token).then(setTarget).catch(() => setLoadError('This review link is invalid or has expired.'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || rating === 0) return
    setError(null)
    setSubmitting(true)
    try {
      await api.submitReview(token, rating, comment)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return <div className="flex flex-1 items-center justify-center px-4 py-20 text-center text-accent-700">{loadError}</div>
  }

  if (!target) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-400">Loading…</div>
  }

  if (target.alreadyReviewed || submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <CheckCircle2 size={36} className="text-brand-500" />
        <h1 className="mt-4 text-xl font-bold text-ink-900">Thanks for your feedback</h1>
        <p className="mt-2 text-ink-500">Your review for {target.doctorName} has been recorded.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-ink-100 bg-white p-8">
        <h1 className="text-xl font-bold text-ink-900">How was your visit?</h1>
        <p className="mt-1 text-sm text-ink-500">
          {target.patientFirstName}, tell other patients about your visit with {target.doctorName}.
        </p>

        {error && <div className="mt-4 rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
              >
                <Star
                  size={32}
                  className={n <= (hoverRating || rating) ? 'fill-brand-500 text-brand-500' : 'fill-ink-100 text-ink-200'}
                />
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: share more about your experience"
            className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />

          <button
            type="submit"
            disabled={rating === 0 || submitting}
            className="rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      </div>
    </div>
  )
}
