/**
 * AuditLogsPage — super_admin only — read-only view of all moderation actions
 */
import { useState } from 'react'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { adminApi } from '@/api/admin'
import { useApi } from '@/hooks/useApi'
import { formatDateTime } from '@/utils/formatters'
import Pagination from '@/components/ui/Pagination'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import clsx from 'clsx'

export default function AuditLogsPage() {
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')

  const { data, isLoading } = useApi(
    () => adminApi.listAuditLogs({ page, page_size: 50, search }),
    [page, search],
  )
  const logs = data?.results ?? []

  return (
    <>
      <Helmet><title>Audit Logs — GreenTalk</title></Helmet>
      <div className="container py-8">
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] mb-6">Audit Logs</h1>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Read-only record of all moderation and admin actions. Entries cannot be edited or deleted.
        </p>

        <div className="mb-4 max-w-sm">
          <input type="search" placeholder="Search action or email…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="form-input" aria-label="Search audit logs" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : logs.length === 0 ? (
          <p className="text-[var(--color-muted)] text-center py-12">No audit log entries found.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-sm" aria-label="Audit logs">
                <thead className="bg-[var(--color-green-50)]">
                  <tr>
                    {['Time', 'Actor', 'Action', 'Target', 'IP'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-[var(--color-brand-dark)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} className={clsx('border-t border-[var(--color-border)]', i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg)]')}>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-3">{log.actor?.username ?? '—'}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-[var(--color-green-50)] px-2 py-0.5 rounded">{log.action}</code>
                      </td>
                      <td className="px-4 py-3 text-xs">{log.target_table}:{log.target_id}</td>
                      <td className="px-4 py-3 text-xs">{log.ip_address ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={data?.total_pages ?? 1} onPageChange={setPage} />
          </>
        )}
      </div>
    </>
  )
}
