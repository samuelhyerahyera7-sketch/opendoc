import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import DoctorCard from '../components/DoctorCard'
import MedicalAidSelect from '../components/MedicalAidSelect'
import { api, type ApiDoctor, type Specialty } from '../api/client'

type SortKey = 'relevance' | 'rating' | 'distance'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100]

export default function SearchResults() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const loc = params.get('loc') ?? ''
  const latParam = params.get('lat')
  const lngParam = params.get('lng')
  const lat = latParam ? parseFloat(latParam) : undefined
  const lng = lngParam ? parseFloat(lngParam) : undefined
  const hasLocation = lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng)

  const [sort, setSort] = useState<SortKey>(hasLocation ? 'distance' : 'relevance')
  const [insuranceFilter, setInsuranceFilter] = useState<string>('')
  const [acceptingOnly, setAcceptingOnly] = useState(false)
  const [radiusKm, setRadiusKm] = useState(25)

  const [insurances, setInsurances] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [results, setResults] = useState<ApiDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getInsurances().then(setInsurances).catch(() => {})
    api.getSpecialties().then(setSpecialties).catch(() => {})
  }, [])

  useEffect(() => {
    setSort(hasLocation ? 'distance' : 'relevance')
  }, [latParam, lngParam, hasLocation])

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .searchDoctors({
        q,
        insurance: insuranceFilter,
        acceptingOnly,
        sort,
        lat: hasLocation ? lat : undefined,
        lng: hasLocation ? lng : undefined,
        radiusKm: hasLocation ? radiusKm : undefined,
      })
      .then(setResults)
      .catch(() => setError('Could not load doctors right now. Please try again.'))
      .finally(() => setLoading(false))
  }, [q, insuranceFilter, acceptingOnly, sort, hasLocation, lat, lng, radiusKm])

  return (
    <div className="bg-ink-50/60">
      <div className="border-b border-ink-100 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SearchBar initialQuery={q} initialLocation={loc} initialLat={lat} initialLng={lng} />
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

              {hasLocation && (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-ink-900">Distance</p>
                  <select
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-400"
                  >
                    {RADIUS_OPTIONS.map((r) => (
                      <option key={r} value={r}>Within {r} km</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-ink-400">Based on {loc || 'your location'}.</p>
                </div>
              )}

              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-ink-900">Medical aid / Insurance</p>
                <MedicalAidSelect
                  value={insuranceFilter}
                  onChange={setInsuranceFilter}
                  options={insurances}
                  placeholder="Any medical aid"
                />
                <p className="mt-1.5 text-xs text-ink-400">Only show doctors who accept your plan.</p>
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
                {loading ? 'Searching…' : `${results.length} doctor${results.length === 1 ? '' : 's'} ${q ? `for "${q}"` : 'found'}`}
                {!loading && loc && <span className="font-normal text-ink-500"> near {loc}</span>}
              </h1>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-400"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="rating">Sort: Highest Rated</option>
                {hasLocation && <option value="distance">Sort: Nearest</option>}
              </select>
            </div>

            {error && (
              <div className="rounded-2xl border border-dashed border-accent-300 bg-accent-50 p-6 text-center text-accent-700">
                {error}
              </div>
            )}

            {!error && !loading && results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
                <p className="text-lg font-semibold text-ink-800">No doctors found</p>
                <p className="mt-1 text-sm text-ink-500">
                  {hasLocation
                    ? 'Try widening your distance filter, or a different specialty or medical aid.'
                    : 'Try a different specialty, name, medical aid, or location.'}
                </p>
              </div>
            )}

            {!error && (
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
