/**
 * UserManagementPage — super_admin only
 * List, search, change role, deactivate/activate users.
 */
import { useState } from 'react'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { adminApi } from '@/api/admin'
import { useApi } from '@/hooks/useApi'
import { formatDate, roleLabel } from '@/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function UserManagementPage() {
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading, refetch } = useApi(
    () => adminApi.listUsers({ search, page, page_size: 20 }),
    [search, page],
  )
  const users = data?.results ?? []

  async function toggleActive(user) {
    await adminApi.updateUser(user.id, { is_active: !user.is_active })
    toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}.`)
    refetch()
  }

  async function changeRole(user, role) {
    await adminApi.updateUser(user.id, { role })
    toast.success(`Role updated to ${roleLabel(role)}.`)
    refetch()
  }

  return (
    <>
      <Helmet><title>User Management — GreenTalk</title></Helmet>
      <div className="container py-8">
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] mb-6">User Management</h1>

        <div className="mb-4 max-w-sm">
          <input type="search" placeholder="Search by email or username…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="form-input" aria-label="Search users" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : users.length === 0 ? (
          <p className="text-[var(--color-muted)] text-center py-12">No users found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm" aria-label="User list">
              <thead className="bg-[var(--color-green-50)]">
                <tr>
                  {['Email', 'Username', 'Role', 'Verified', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-[var(--color-brand-dark)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={clsx('border-t border-[var(--color-border)]', i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg)]')}>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.username}</td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}
                        className="form-input py-1 px-2 text-xs" aria-label={`Change role for ${u.username}`}>
                        {['user', 'blog_admin', 'super_admin'].map((r) => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">{u.is_verified ? '✅' : '❌'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(u.date_joined)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(u)}
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
