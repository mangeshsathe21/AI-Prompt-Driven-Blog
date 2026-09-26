/**
 * LoadingSpinner — accessible animated spinner
 * Props: size ('sm'|'md'|'lg'), className
 */
import PropTypes from 'prop-types'
import clsx from 'clsx'

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

export default function LoadingSpinner({ size = 'md', className }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-[var(--color-brand)]', sizes[size], className)}
    >
      <span className="sr-only">Loading…</span>
    </div>
  )
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
}
