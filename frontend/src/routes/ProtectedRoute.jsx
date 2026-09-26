/**
 * GreenTalk — ProtectedRoute
 * ============================
 * Wraps routes that require authentication and/or specific roles.
 *
 * SECURITY NOTE:
 * This component provides UX-level route guarding only.
 * Every API endpoint is also protected server-side by Django permissions.
 * Hiding a route here does NOT replace backend authorisation.
 *
 * Usage:
 *   <ProtectedRoute>                      — any authenticated user
 *   <ProtectedRoute role="blog_admin">    — blog_admin or super_admin
 *   <ProtectedRoute role="super_admin">   — super_admin only
 */

import { Navigate, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useAuth } from '@/context/AuthContext'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Still restoring session from refresh cookie — don't redirect yet
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Not logged in — redirect to login, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check
  if (role) {
    const allowed =
      role === 'blog_admin'
        ? user?.role === 'blog_admin' || user?.role === 'super_admin'
        : user?.role === role

    if (!allowed) {
      return <Navigate to="/403" replace />
    }
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  /** Minimum role required. Omit for "any authenticated user". */
  role: PropTypes.oneOf(['blog_admin', 'super_admin']),
}
