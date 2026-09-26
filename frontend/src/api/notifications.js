/**
 * GreenTalk — Notifications API
 */
import apiClient from './client'

export const notificationsApi = {
  list: (params = {}) => apiClient.get('/notifications/', { params }),
  markRead: (ids = []) =>
    apiClient.post('/notifications/mark-read/', ids.length ? { ids } : {}),
}
