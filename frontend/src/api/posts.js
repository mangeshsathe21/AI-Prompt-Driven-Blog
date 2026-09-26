/**
 * GreenTalk — Posts API
 */
import apiClient from './client'

export const postsApi = {
  /** GET /api/posts/ — paginated list with optional filters */
  list: (params = {}) => apiClient.get('/posts/', { params }),

  /** GET /api/posts/<slug>/ */
  get: (slug) => apiClient.get(`/posts/${slug}/`),

  /** POST /api/posts/ — create new post */
  create: (data) => {
    const form = data instanceof FormData ? data : toFormData(data)
    return apiClient.post('/posts/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** PATCH /api/posts/<slug>/ */
  update: (slug, data) => {
    const form = data instanceof FormData ? data : toFormData(data)
    return apiClient.patch(`/posts/${slug}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** DELETE /api/posts/<slug>/ */
  delete: (slug) => apiClient.delete(`/posts/${slug}/`),

  /** POST /api/posts/<slug>/approve/ */
  approve: (slug) => apiClient.post(`/posts/${slug}/approve/`),

  /** POST /api/posts/<slug>/reject/ */
  reject: (slug, reason = '') => apiClient.post(`/posts/${slug}/reject/`, { reason }),

  /** POST /api/posts/<slug>/unpublish/ */
  unpublish: (slug) => apiClient.post(`/posts/${slug}/unpublish/`),

  /** GET /api/search/?q= */
  search: (q, params = {}) => apiClient.get('/search/', { params: { q, ...params } }),
}

// Helper: convert plain object to FormData for file uploads
function toFormData(obj) {
  const fd = new FormData()
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      if (Array.isArray(val)) {
        val.forEach((v) => fd.append(key, v))
      } else {
        fd.append(key, val)
      }
    }
  })
  return fd
}
