import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { exchangeApi, purchaseApi } from '@/api/marketplace'
import ListingCard from '@/components/marketplace/ListingCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function MyListingsPage() {
  const [tab, setTab] = useState('exchange')

  const { data: exData, isLoading: exLoading, refetch: refetchEx } = useApi(() => exchangeApi.list(), [])
  const { data: puData, isLoading: puLoading, refetch: refetchPu } = useApi(() => purchaseApi.list(), [])
  const exchangeListings  = exData?.results ?? []
  const purchaseListings  = puData?.results ?? []

  async function deleteExchange(id) {
    if (!window.confirm('Delete this listing?')) return
    await exchangeApi.delete(id); toast.success('Deleted.'); refetchEx()
  }
  async function deletePurchase(id) {
    if (!window.confirm('Delete this listing?')) return
    await purchaseApi.delete(id); toast.success('Deleted.'); refetchPu()
  }

  return (
    <>
      <Helmet><title>My Listings — GreenTalk</title></Helmet>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">My Listings</h1>
          <div className="flex gap-2">
            <Link to="/listings/exchange/create" className="btn btn-ghost btn-sm">+ Exchange</Link>
            <Link to="/listings/purchase/create" className="btn btn-primary btn-sm">+ Sell</Link>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
          {[['exchange', 'Exchange'], ['purchase', 'Marketplace']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab === t ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-[var(--color-muted)]'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'exchange' && (
          exLoading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> :
          exchangeListings.length === 0 ? <p className="text-[var(--color-muted)] py-8 text-center">No exchange listings yet.</p> :
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {exchangeListings.map((l) => (
              <div key={l.id} className="relative group">
                <ListingCard listing={l} type="exchange" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => deleteExchange(l.id)} className="btn btn-sm bg-white border border-[var(--color-border)] text-[var(--color-danger)]">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'purchase' && (
          puLoading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> :
          purchaseListings.length === 0 ? <p className="text-[var(--color-muted)] py-8 text-center">No purchase listings yet.</p> :
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {purchaseListings.map((l) => (
              <div key={l.id} className="relative group">
                <ListingCard listing={l} type="purchase" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => deletePurchase(l.id)} className="btn btn-sm bg-white border border-[var(--color-border)] text-[var(--color-danger)]">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
