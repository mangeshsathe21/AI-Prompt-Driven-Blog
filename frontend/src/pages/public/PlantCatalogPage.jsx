import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { plantsApi } from '@/api/marketplace'
import Pagination from '@/components/ui/Pagination'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import SearchBar from '@/components/ui/SearchBar'

export default function PlantCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const page = Number(searchParams.get('page') || 1)

  const { data, isLoading } = useApi(
    () => plantsApi.list({ search: q, page, page_size: 12 }),
    [q, page],
  )
  const plants = data?.results ?? []

  function handleSearch(val) {
    const next = new URLSearchParams()
    if (val) next.set('q', val)
    setSearchParams(next)
    setQ(val)
  }

  return (
    <>
      <Helmet>
        <title>Plant Catalog — GreenTalk</title>
        <meta name="description" content="Explore native and common plants of India." />
      </Helmet>

      <div className="container py-8">
        <h1 className="text-3xl font-bold text-[var(--color-brand-dark)] mb-4">Plant Catalog</h1>
        <p className="text-[var(--color-muted)] mb-6 max-w-xl">
          Browse our reference catalog of plants — filter by climate zone, water needs, and more.
        </p>
        <div className="max-w-md mb-6">
          <SearchBar value={q} onChange={setQ} onSubmit={handleSearch} placeholder="Search plants…" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : plants.length === 0 ? (
          <p className="text-[var(--color-muted)] py-8 text-center">No plants found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {plants.map((plant) => (
              <div key={plant.id} className="card p-4 flex flex-col gap-2">
                {plant.image_url ? (
                  <img src={plant.image_url} alt={plant.name} className="w-full h-36 object-cover rounded-lg" loading="lazy" />
                ) : (
                  <div className="w-full h-36 bg-[var(--color-green-50)] rounded-lg flex items-center justify-center text-4xl">🌿</div>
                )}
                <h2 className="font-bold text-[var(--color-brand-dark)]">{plant.name}</h2>
                {plant.scientific_name && (
                  <p className="text-xs italic text-[var(--color-muted)]">{plant.scientific_name}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {plant.climate_zone && <span className="badge badge-blue text-xs">{plant.climate_zone}</span>}
                  {plant.water_needs  && <span className="badge badge-green text-xs">💧 {plant.water_needs}</span>}
                  {plant.native_status && <span className="badge badge-gray text-xs">{plant.native_status}</span>}
                </div>
                {plant.description && (
                  <p className="text-xs text-[var(--color-muted)] line-clamp-2">{plant.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <Pagination
          currentPage={page}
          totalPages={data?.total_pages ?? 1}
          onPageChange={(p) => setSearchParams({ q, page: p })}
        />
      </div>
    </>
  )
}
