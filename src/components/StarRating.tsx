import { Star } from 'lucide-react'

export default function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={15}
            className={i < Math.round(rating) ? 'fill-brand-500 text-brand-500' : 'fill-ink-200 text-ink-200'}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-ink-800">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-sm text-ink-500">({count})</span>}
    </div>
  )
}
