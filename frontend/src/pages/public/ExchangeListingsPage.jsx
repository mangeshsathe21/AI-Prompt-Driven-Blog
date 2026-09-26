import { useSearchParams } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { exchangeApi } from '@/api/marketplace'
import ListingCard from '@/components/marketplace/ListingCard'
import Pagination from '@/components/ui/Pagination'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ExchangeListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const page = Number(searchParams.get('page') || 1)
  const type = searchParams.get('listing_type') || ''

  const { data, isLoading } = useApi(
    () => exchangeApi.list({ page, page_size: 12, listing_type: type || undefined }),
    [page, type],
  )
  const listings = data?.results ?? []

  return (
    <>
      <Helmet>
        <title>Plant Exchange — GreenTalk</title>
        <meta name="description" content="Give away or swap plants with community members." />
      </Helmet>

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-brand-dark)]">Plant Exchange</h1>
            <p className="text-[var(--color-muted)] mt-1">Give away or swap plants with nearby community members.</p>
          </div>
          {isAuthenticated && (
            <Link to="/listings/exchange/create" className="btn btn-primary">+ Create listing</Link>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[['', 'All'], ['free', 'Free'], ['swap', 'Swap']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSearchParams(val ? { listing_type: val } : {})}
              className={`btn btn-sm ${type === val ? 'btn-primary' : 'btn-ghost'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-muted)]">
            <p className="text-5xl mb-4">🌱</p>
            <p>No exchange listings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((l) => <ListingCard key={l.id} listing={l} type="exchange" />)}
          </div>
        )}
        <Pagination
          currentPage={page}
          totalPages={data?.total_pages ?? 1}
          onPageChange={(p) => setSearchParams({ page: p, ...(type && { listing_type: type }) })}
        />
      </div>
    </>
  )
}
