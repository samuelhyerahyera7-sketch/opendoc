import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import DoctorCard from '../components/DoctorCard'
import { insurances, searchDoctors, specialties } from '../data/mockData'

type SortKey = 'relevance' | 'rating' | 'distance'

export default function SearchResults() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const loc = params.get('loc') ?? ''

  const [sort, setSort] = useState<SortKey>('relevance')
  const [insuranceFilter, setInsuranceFilter] = useState<string>('')
  const [acceptingOnly, setAcceptingOnly] = useState(false)

  const results = useMemo(() => {
    let list = searchDoctors(q)
    if (insuranceFilter) list = list.filter((d) => d.insurances.includes(insuranceFilter))
    if (acceptingOnly) list = list.filter((d) => d.acceptingNew)
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating)
    if (sort === 'distance') list = [...list].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
    return list
  }, [q, insuranceFilter, acceptingOnly, sort])

  return (
    <div className="bg-ink-50/60">
      <div className="border-b border-ink-100 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SearchBar initialQuery={q} initialLocation={loc} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 text-ink-900">
                <SlidersHorizontal size={16} />
                <h3 className="font-bold">Filters</h3>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={acceptingOnly}
                  onChange={(e) => setAcceptingOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
                />
                Accepting new patients
              </label>

              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-ink-900">Insurance</p>
                <select
                  value={insuranceFilter}
                  onChange={(e) => setInsuranceFilter(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-400"
                >
                  <option value="">Any insurance</option>
                  {insurances.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-ink-900">Specialty</p>
                <div className="flex flex-wrap gap-2">
                  {specialties.slice(0, 8).map((s) => (
                    <a
                      key={s.name}
                      href={`/search?q=${encodeURIComponent(s.name)}`}
                      className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-600"
                    >
                      {s.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold text-ink-900">
                {results.length} doctor{results.length === 1 ? '' : 's'} {q ? `for "${q}"` : 'found'}
                {loc && <span className="font-normal text-ink-500"> near {loc}</span>}
              </h1>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-400"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="rating">Sort: Highest Rated</option>
                <option value="distance">Sort: Nearest</option>
              </select>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
                <p className="text-lg font-semibold text-ink-800">No doctors found</p>
                <p className="mt-1 text-sm text-ink-500">Try a different specialty, name, or location.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {results.map((d) => (
                  <DoctorCard key={d.id} doctor={d} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
