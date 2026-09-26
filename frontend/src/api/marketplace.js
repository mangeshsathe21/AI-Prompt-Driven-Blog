/**
 * GreenTalk — Marketplace API
 * (Plants, Exchange Listings, Purchase Listings, Orders)
 */
import apiClient from './client'

// ---- Plants ----
export const plantsApi = {
  list: (params = {}) => apiClient.get('/plants/', { params }),
  get: (id) => apiClient.get(`/plants/${id}/`),
}

// ---- Exchange Listings ----
export const exchangeApi = {
  list: (params = {}) => apiClient.get('/exchange-listings/', { params }),
  get: (id) => apiClient.get(`/exchange-listings/${id}/`),
  create: (data) => apiClient.post('/exchange-listings/', data),
  update: (id, data) => apiClient.patch(`/exchange-listings/${id}/`, data),
  delete: (id) => apiClient.delete(`/exchange-listings/${id}/`),
  updateStatus: (id, status) =>
    apiClient.patch(`/exchange-listings/${id}/update-status/`, { status }),
}

// ---- Purchase Listings ----
export const purchaseApi = {
  list: (params = {}) => apiClient.get('/purchase-listings/', { params }),
  get: (id) => apiClient.get(`/purchase-listings/${id}/`),
  create: (data) => apiClient.post('/purchase-listings/', data),
  update: (id, data) => apiClient.patch(`/purchase-listings/${id}/`, data),
  delete: (id) => apiClient.delete(`/purchase-listings/${id}/`),
}

// ---- Orders ----
export const ordersApi = {
  list: () => apiClient.get('/orders/'),
  get: (id) => apiClient.get(`/orders/${id}/`),
  create: (data) => apiClient.post('/orders/', data),
  updateStatus: (id, status) =>
    apiClient.patch(`/orders/${id}/update-status/`, { status }),
}
