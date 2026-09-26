/**
 * GreenTalk — Admin API (super_admin only)
 */
import apiClient from './client'

export const adminApi = {
  // Users
  listUsers: (params = {}) => apiClient.get('/admin/users/', { params }),
  getUser: (id) => apiClient.get(`/admin/users/${id}/`),
  updateUser: (id, data) => apiClient.patch(`/admin/users/${id}/`, data),

  // Audit logs
  listAuditLogs: (params = {}) => apiClient.get('/admin/audit-logs/', { params }),
}
