/**
 * GreenTalk — Notification Context
 * ===================================
 * Fetches and stores in-app notifications for the logged-in user.
 * Polls every 60 seconds when authenticated.
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { notificationsApi } from '@/api/notifications'
import { useAuth } from './AuthContext'

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
}

function notifReducer(state, action) {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter((n) => !n.is_read).length,
        isLoading: false,
      }
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          action.payload.includes(n.id) ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(
          0,
          state.unreadCount - action.payload.length,
        ),
      }
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'CLEAR':
      return initialState
    default:
      return state
  }
}

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notifReducer, initialState)
  const { isAuthenticated } = useAuth()

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const { data } = await notificationsApi.list({ page_size: 20 })
      dispatch({ type: 'SET_NOTIFICATIONS', payload: data.results ?? data })
    } catch {
      // Silent fail — notifications are non-critical
    }
  }, [isAuthenticated])

  // Initial fetch + poll every 60 s
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'CLEAR' })
      return
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchNotifications])

  const markRead = useCallback(async (ids = []) => {
    await notificationsApi.markRead(ids)
    if (ids.length === 0) {
      dispatch({ type: 'MARK_ALL_READ' })
    } else {
      dispatch({ type: 'MARK_READ', payload: ids })
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{ ...state, fetchNotifications, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

NotificationProvider.propTypes = { children: PropTypes.node.isRequired }

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
