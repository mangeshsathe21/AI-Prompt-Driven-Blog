/**
 * GreenTalk — Authentication Context
 * =====================================
 * Manages user session state using useReducer.
 * Access token lives ONLY in this context (memory) — never localStorage.
 *
 * SECURITY NOTES:
 * - Access token stored in React state only (cleared on page refresh).
 * - On page refresh, we call /api/auth/token/refresh/ automatically —
 *   the browser sends the HttpOnly refresh cookie and we get a new
 *   access token silently. This restores the session without localStorage.
 * - configureClient() wires this context to the axios interceptor so
 *   every request gets the current token injected automatically.
 *
 * Role hierarchy: user < blog_admin < super_admin
 */

import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { authApi } from '@/api/auth'
import { configureClient } from '@/api/client'

// ---- State shape ----
const initialState = {
  user: null,        // { id, email, username, role, is_verified, full_name, ... }
  accessToken: null, // JWT access token — in memory only
  isLoading: true,   // true while restoring session on mount
  isAuthenticated: false,
}

// ---- Reducer ----
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
      }
    case 'LOGOUT':
      return { ...initialState, isLoading: false }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } }
    case 'SET_TOKEN':
      return { ...state, accessToken: action.payload }
    default:
      return state
  }
}

// ---- Context ----
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  // Use a ref so the interceptor always has the latest token without re-closing
  const tokenRef = useRef(null)

  // Keep ref in sync with state
  useEffect(() => {
    tokenRef.current = state.accessToken
  }, [state.accessToken])

  // Wire axios interceptor with getter + unauthorised callback
  useEffect(() => {
    configureClient({
      getAccessToken: () => tokenRef.current,
      onUnauthorized: () => dispatch({ type: 'LOGOUT' }),
    })
  }, [])

  // Listen for token-refreshed events from the axios interceptor
  useEffect(() => {
    const handler = (e) => {
      dispatch({ type: 'SET_TOKEN', payload: e.detail.token })
    }
    window.addEventListener('greentalk:token-refreshed', handler)
    return () => window.removeEventListener('greentalk:token-refreshed', handler)
  }, [])

  // ---- Restore session on page load ----
  // Calls /api/auth/token/refresh/ — the HttpOnly cookie is sent automatically.
  // If the cookie is valid we get a new access token and fetch the profile.
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await authApi.refreshToken()
        const { data: user } = await authApi.getProfile()
        // Temporarily set token so getProfile request succeeds
        tokenRef.current = data.access
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, accessToken: data.access },
        })
      } catch {
        // No valid refresh cookie — user is logged out
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
    restoreSession()
  }, [])

  // ---- Actions ----
  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password)
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user: data.user, accessToken: data.access },
    })
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore errors — clear state regardless
    }
    dispatch({ type: 'LOGOUT' })
  }, [])

  const updateUser = useCallback((updates) => {
    dispatch({ type: 'UPDATE_USER', payload: updates })
  }, [])

  // ---- Role helpers ----
  const isUser       = state.isAuthenticated
  const isBlogAdmin  = state.user?.role === 'blog_admin' || state.user?.role === 'super_admin'
  const isSuperAdmin = state.user?.role === 'super_admin'

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    isUser,
    isBlogAdmin,
    isSuperAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

/** Hook to consume auth context */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
