import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search } from 'lucide-react'

export default function SearchBar({ initialQuery = '', initialLocation = '' }: { initialQuery?: string; initialLocation?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (location) params.set('loc', location)
    navigate(`/search?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl shadow-ink-900/10 ring-1 ring-ink-100 sm:flex-row sm:rounded-full"
    >
      <div className="flex flex-1 items-center gap-3 px-5 py-4">
        <Search size={20} className="shrink-0 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Doctor's name, specialty, or condition"
          className="w-full border-0 text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
        />
      </div>
      <div className="hidden w-px bg-ink-100 sm:block" />
      <div className="flex flex-1 items-center gap-3 border-t border-ink-100 px-5 py-4 sm:border-t-0">
        <MapPin size={20} className="shrink-0 text-ink-400" />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-full border-0 text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
        />
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
