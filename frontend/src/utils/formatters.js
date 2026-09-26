/**
 * GreenTalk — Formatting Utilities
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm')
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
}

export function formatPrice(price, currency = 'INR') {
  if (price === null || price === undefined) return ''
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 0,
  }).format(price)
}

export function truncate(str, max = 160) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/** Convert a role string to a human-readable label */
export function roleLabel(role) {
  return { user: 'User', blog_admin: 'Blog Admin', super_admin: 'Super Admin' }[role] ?? role
}

/** Status badge variant mapping */
export function statusVariant(status) {
  return (
    {
      published: 'badge-green',
      pending:   'badge-yellow',
      draft:     'badge-gray',
      rejected:  'badge-red',
      active:    'badge-green',
      available: 'badge-green',
      reserved:  'badge-yellow',
      completed: 'badge-blue',
      sold_out:  'badge-red',
      removed:   'badge-gray',
      confirmed: 'badge-blue',
      shipped:   'badge-blue',
      cancelled: 'badge-red',
    }[status] ?? 'badge-gray'
  )
}
