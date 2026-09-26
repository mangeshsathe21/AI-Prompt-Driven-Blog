/**
 * ListingCard — displays an exchange or purchase listing summary
 * Props: listing object, type ('exchange'|'purchase')
 */
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { timeAgo, formatPrice, statusVariant } from '@/utils/formatters'
import clsx from 'clsx'

export default function ListingCard({ listing, type = 'purchase' }) {
  const isExchange = type === 'exchange'
  const detailUrl  = isExchange ? `/exchange/${listing.id}` : `/marketplace/${listing.id}`
  const plantName  = listing.plant_display?.name || listing.plant_name || listing.title || 'Plant'

  return (
    <article className="card flex flex-col h-full group" aria-label={plantName}>
      {/* Image placeholder or first image */}
      <div className="bg-[var(--color-green-50)] h-40 flex items-center justify-center text-5xl select-none">
        🌿
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span className={clsx('badge text-xs', statusVariant(listing.status))}>
            {listing.status}
          </span>
          {isExchange && (
            <span className="badge badge-blue text-xs">{listing.listing_type}</span>
          )}
        </div>

        {/* Title */}
        <h2 className="font-bold leading-snug group-hover:text-[var(--color-brand)] transition-colors">
          <Link to={detailUrl} className="focus:outline-none focus-visible:underline">
            {plantName}
          </Link>
        </h2>

        {/* Price (purchase) or swap-for (exchange) */}
        {!isExchange && listing.price !== undefined && (
          <p className="text-[var(--color-brand)] font-bold">
            {formatPrice(listing.price, listing.currency)}
          </p>
        )}
        {isExchange && listing.swap_for_text && (
          <p className="text-xs text-[var(--color-muted)] italic">Swap for: {listing.swap_for_text}</p>
        )}

        {/* Location + seller */}
        <div className="mt-auto pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-muted)] flex justify-between flex-wrap gap-1">
          <span>{listing.location || listing.user?.username || ''}</span>
          <span>{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </article>
  )
}

ListingCard.propTypes = {
  listing: PropTypes.object.isRequired,
  type: PropTypes.oneOf(['exchange', 'purchase']),
}
