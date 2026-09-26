/**
 * GreenTalk — Axios API Client
 * ==============================
 * Centralised HTTP client with:
 *  - JWT access token attached via request interceptor (from memory only)
 *  - Automatic silent token refresh on 401 via the HttpOnly refresh cookie
 *  - withCredentials: true so the browser sends the HttpOnly cookie
 *  - Centralised error toast notifications
 *  - Queue of in-flight requests while refresh is happening (no thundering herd)
 *
 * SECURITY NOTES:
 *  - Access token is NEVER stored in localStorage or sessionStorage.
 *    It lives only in AuthContext memory (React state).
 *  - Refresh token is stored in an HttpOnly cookie by the backend;
 *    this file never reads or writes it directly.
 *  - withCredentials: true is required for the browser to send the cookie.
 */

import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// Create the main axios instance
const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // sends the HttpOnly refresh cookie on every request
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ---- Token injection ----
// getAccessToken and setAccessToken are set from AuthContext after init.
// This avoids a circular dependency between client.js and AuthContext.
let _getAccessToken = () => null
let _onUnauthorized = () => {}

export function configureClient({ getAccessToken, onUnauthorized }) {
  _getAccessToken = getAccessToken
  _onUnauthorized = onUnauthorized
}

// ---- Request interceptor: attach Bearer token ----
apiClient.interceptors.request.use(
  (config) => {
    const token = _getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ---- Refresh token queue ----
// While a refresh is in flight, queue all other 401 requests.
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

// ---- Response interceptor: handle 401, refresh, retry ----
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    // to avoid infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/token/refresh/')
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // POST to refresh endpoint — backend reads the HttpOnly cookie
        const { data } = await axios.post(
          `${BASE_URL}/api/auth/token/refresh/`,
          {},
          { withCredentials: true },
        )
        const newToken = data.access

        // Persist the new access token in AuthContext
        // AuthContext listens via a custom event
        window.dispatchEvent(
          new CustomEvent('greentalk:token-refreshed', { detail: { token: newToken } }),
        )

        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Refresh failed — user must log in again
        _onUnauthorized()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Show error toast for non-401 errors (skip network errors from refresh)
    if (error.response && error.response.status !== 401) {
      const message =
        error.response.data?.message ||
        error.response.data?.detail ||
        `Error ${error.response.status}`
      // Don't toast on 404 (handled by components)
      if (error.response.status !== 404) {
        toast.error(message)
      }
    } else if (!error.response) {
      toast.error('Network error — please check your connection.')
    }

    return Promise.reject(error)
  },
)

export default apiClient
