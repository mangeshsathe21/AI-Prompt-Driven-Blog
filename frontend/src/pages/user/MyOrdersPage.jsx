import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { ordersApi } from '@/api/marketplace'
import { formatDate, formatPrice, statusVariant } from '@/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function MyOrdersPage() {
  const { data, isLoading, refetch } = useApi(() => ordersApi.list(), [])
  const orders = data?.results ?? data ?? []

  async function updateStatus(id, status) {
    await ordersApi.updateStatus(id, status)
    toast.success(`Order marked as ${status}.`)
    refetch()
  }

  return (
    <>
      <Helmet><title>My Orders — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] mb-6">My Orders</h1>
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : orders.length === 0 ? (
          <p className="text-[var(--color-muted)] text-center py-12">No orders yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div key={order.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold">{order.listing_detail?.title || `Listing #${order.listing}`}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      Qty: {order.quantity} · {formatPrice(order.total_price, order.listing_detail?.currency)}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={clsx('badge', statusVariant(order.status))}>{order.status}</span>
                </div>
                {order.notes && (
                  <p className="text-sm text-[var(--color-muted)] mt-2 italic">"{order.notes}"</p>
                )}
                {/* Buyer cancel action */}
                {order.status === 'pending' && (
                  <button onClick={() => updateStatus(order.id, 'cancelled')}
                    className="btn btn-danger btn-sm mt-3">
                    Cancel order
                  </button>
                )}
                {/* Seller confirm actions */}
                {order.status === 'pending' && (
                  <button onClick={() => updateStatus(order.id, 'confirmed')}
                    className="btn btn-primary btn-sm mt-3 ml-2">
                    Confirm
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button onClick={() => updateStatus(order.id, 'shipped')}
                    className="btn btn-primary btn-sm mt-3">
                    Mark shipped
                  </button>
                )}
                {order.status === 'shipped' && (
                  <button onClick={() => updateStatus(order.id, 'completed')}
                    className="btn btn-primary btn-sm mt-3">
                    Mark completed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
