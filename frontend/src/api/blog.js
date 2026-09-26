/**
 * GreenTalk — Blog supporting APIs (categories, tags, comments, likes)
 */
import apiClient from './client'

// ---- Categories ----
export const categoriesApi = {
  list: () => apiClient.get('/categories/'),
  get: (slug) => apiClient.get(`/categories/${slug}/`),
  create: (data) => apiClient.post('/categories/', data),
  update: (slug, data) => apiClient.patch(`/categories/${slug}/`, data),
  delete: (slug) => apiClient.delete(`/categories/${slug}/`),
}

// ---- Tags ----
export const tagsApi = {
  list: (params = {}) => apiClient.get('/tags/', { params }),
  create: (data) => apiClient.post('/tags/', data),
  update: (slug, data) => apiClient.patch(`/tags/${slug}/`, data),
  delete: (slug) => apiClient.delete(`/tags/${slug}/`),
}

// ---- Comments ----
export const commentsApi = {
  list: (postId, params = {}) =>
    apiClient.get('/comments/', { params: { post: postId, ...params } }),
  create: (data) => apiClient.post('/comments/', data),
  update: (id, data) => apiClient.patch(`/comments/${id}/`, data),
  delete: (id) => apiClient.delete(`/comments/${id}/`),
  moderate: (id, status) =>
    apiClient.post(`/comments/${id}/moderate/`, { status }),
}

// ---- Likes ----
export const likesApi = {
  /** Toggle like on post or comment. Pass { post: id } or { comment: id } */
  toggle: (data) => apiClient.post('/likes/', data),
}
