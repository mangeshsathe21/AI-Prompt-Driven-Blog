import { Helmet } from '@vuer-ai/react-helmet-async'
import { useNotifications } from '@/context/NotificationContext'
import { timeAgo } from '@/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import clsx from 'clsx'

export default function NotificationsPage() {
  const { notifications, isLoading, markRead } = useNotifications()

  return (
    <>
      <Helmet><title>Notifications — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">Notifications</h1>
          {notifications.some((n) => !n.is_read) && (
            <button onClick={() => markRead([])} className="btn btn-ghost btn-sm">
              Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-muted)]">
            <p className="text-5xl mb-4">🔔</p>
            <p>You're all caught up!</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Notification list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={clsx(
                  'card p-4 flex items-start justify-between gap-3',
                  !n.is_read && 'border-l-4 border-[var(--color-brand)] bg-[var(--color-green-50)]',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm', !n.is_read && 'font-semibold')}>{n.message}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead([n.id])}
                    className="btn btn-ghost btn-sm shrink-0"
                    aria-label="Mark as read"
                  >
                    ✓
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
