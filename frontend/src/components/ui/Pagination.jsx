/**
 * Pagination — page navigation component
 * Props: currentPage, totalPages, onPageChange
 */
import PropTypes from 'prop-types'
import clsx from 'clsx'

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = buildPageList(currentPage, totalPages)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 flex-wrap mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="btn btn-ghost btn-sm disabled:opacity-40"
      >
        ← Prev
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-[var(--color-muted)]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
            className={clsx(
              'btn btn-sm min-w-[2.25rem]',
              p === currentPage ? 'btn-primary' : 'btn-ghost',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="btn btn-ghost btn-sm disabled:opacity-40"
      >
        Next →
      </button>
    </nav>
  )
}

function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

Pagination.propTypes = {
  currentPage:  PropTypes.number.isRequired,
  totalPages:   PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
}
