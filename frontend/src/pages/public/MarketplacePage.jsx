import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { purchaseApi } from '@/api/marketplace'
import ListingCard from '@/components/marketplace/ListingCard'
import Pagination from '@/components/ui/Pagination'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const page     = Number(searchParams.get('page') || 1)
  const [minPrice, setMin] = useState(searchParams.get('min_price') || '')
  const [maxPrice, setMax] = useState(searchParams.get('max_price') || '')

  const { data, isLoading } = useApi(
    () => purchaseApi.list({
      page, page_size: 12,
      min_price: minPrice || undefined,
      max_price: maxPrice || undefined,
    }),
    [page, minPrice, maxPrice],
  )
  const listings = data?.results ?? []

  function applyFilters(e) {
    e.preventDefault()
    const next = {}
    if (minPrice) next.min_price = minPrice
    if (maxPrice) next.max_price = maxPrice
    setSearchParams(next)
  }

  return (
    <>
      <Helmet>
        <title>Marketplace — GreenTalk</title>
        <meta name="description" content="Buy and sell plants and gardening supplies." />
      </Helmet>

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-brand-dark)]">Marketplace</h1>
            <p className="text-[var(--color-muted)] mt-1">Buy and sell plants, seeds, and gardening supplies.</p>
          </div>
          {isAuthenticated && (
            <Link to="/listings/purchase/create" className="btn btn-primary">+ Sell a plant</Link>
          )}
        </div>

        {/* Price filter */}
        <form onSubmit={applyFilters} className="flex items-end gap-3 mb-6 flex-wrap">
          <div className="form-group mb-0">
            <label htmlFor="min-price" className="form-label text-xs">Min price (₹)</label>
            <input id="min-price" type="number" min="0" value={minPrice} onChange={(e) => setMin(e.target.value)}
              className="form-input w-28" placeholder="0" />
          </div>
          <div className="form-group mb-0">
            <label htmlFor="max-price" className="form-label text-xs">Max price (₹)</label>
            <input id="max-price" type="number" min="0" value={maxPrice} onChange={(e) => setMax(e.target.value)}
              className="form-input w-28" placeholder="9999" />
          </div>
          <button type="submit" className="btn btn-ghost btn-sm">Apply</button>
          <button type="button" onClick={() => { setMin(''); setMax(''); setSearchParams({}) }} className="btn btn-ghost btn-sm">Clear</button>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-muted)]">
            <p className="text-5xl mb-4">🛒</p>
            <p>No listings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((l) => <ListingCard key={l.id} listing={l} type="purchase" />)}
          </div>
        )}
        <Pagination currentPage={page} totalPages={data?.total_pages ?? 1}
          onPageChange={(p) => setSearchParams({ page: p })} />
      </div>
    </>
  )
}
