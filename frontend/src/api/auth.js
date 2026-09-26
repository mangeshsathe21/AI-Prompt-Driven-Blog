/**
 * GreenTalk — Auth API
 * Wraps all /api/auth/ endpoints.
 */
import apiClient from './client'

const AUTH = '/auth'

export const authApi = {
  /** POST /api/auth/register/ */
  register: (data) => apiClient.post(`${AUTH}/register/`, data),

  /** POST /api/auth/login/ — returns { access, user } */
  login: (email, password) => apiClient.post(`${AUTH}/login/`, { email, password }),

  /** POST /api/auth/logout/ */
  logout: () => apiClient.post(`${AUTH}/logout/`),

  /** POST /api/auth/token/refresh/ — reads HttpOnly cookie */
  refreshToken: () => apiClient.post(`${AUTH}/token/refresh/`),

  /** POST /api/auth/verify-email/ */
  verifyEmail: (token) => apiClient.post(`${AUTH}/verify-email/`, { token }),

  /** POST /api/auth/forgot-password/ */
  forgotPassword: (email) => apiClient.post(`${AUTH}/forgot-password/`, { email }),

  /** POST /api/auth/reset-password/ */
  resetPassword: (token, newPassword, newPasswordConfirm) =>
    apiClient.post(`${AUTH}/reset-password/`, {
      token,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),

  /** GET /api/auth/profile/ */
  getProfile: () => apiClient.get(`${AUTH}/profile/`),

  /** PATCH /api/auth/profile/ */
  updateProfile: (data) => apiClient.patch(`${AUTH}/profile/`, data),

  /** PATCH /api/auth/change-password/ */
  changePassword: (oldPassword, newPassword, newPasswordConfirm) =>
    apiClient.patch(`${AUTH}/change-password/`, {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),
}
