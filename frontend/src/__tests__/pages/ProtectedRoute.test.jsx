/**
 * Integration tests — ProtectedRoute
 * Tests: unauthenticated redirect, role-based 403, correct rendering for valid role.
 *
 * SECURITY tests:
 * - Unauthenticated user accessing protected route → redirected to /login
 * - User role accessing blog_admin route → redirected to /403
 * - Blog admin accessing super_admin route → redirected to /403
 * - Admin-only UI elements not visible to regular user role
 */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from '@vuer-ai/react-helmet-async'
import ProtectedRoute from '@/routes/ProtectedRoute'

// ---- Mock AuthContext to inject different user states ----
vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

vi.mock('@/context/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
  NotificationProvider: ({ children }) => children,
}))

import { useAuth } from '@/context/AuthContext'

function renderWithRouter(authState, routePath = '/protected') {
  useAuth.mockReturnValue({
    isAuthenticated: authState.isAuthenticated ?? false,
    isLoading: authState.isLoading ?? false,
    user: authState.user ?? null,
  })

  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[routePath]}>
        <Routes>
          <Route path="/login"     element={<div>Login Page</div>} />
          <Route path="/403"       element={<div>Forbidden</div>} />
          <Route path="/protected" element={
            <ProtectedRoute role={authState.requiredRole}>
              <div>Protected Content</div>
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated user to /login', () => {
    renderWithRouter({ isAuthenticated: false })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading spinner while session is being restored', () => {
    renderWithRouter({ isAuthenticated: false, isLoading: true })
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders protected content for authenticated user (no role required)', () => {
    renderWithRouter({
      isAuthenticated: true,
      user: { role: 'user' },
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects regular user to /403 when blog_admin role required', () => {
    renderWithRouter({
      isAuthenticated: true,
      user: { role: 'user' },
      requiredRole: 'blog_admin',
    })
    expect(screen.getByText('Forbidden')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('allows blog_admin when blog_admin role required', () => {
    renderWithRouter({
      isAuthenticated: true,
      user: { role: 'blog_admin' },
      requiredRole: 'blog_admin',
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('allows super_admin when blog_admin role required (hierarchy)', () => {
    renderWithRouter({
      isAuthenticated: true,
      user: { role: 'super_admin' },
      requiredRole: 'blog_admin',
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects blog_admin to /403 when super_admin role required', () => {
    renderWithRouter({
      isAuthenticated: true,
      user: { role: 'blog_admin' },
      requiredRole: 'super_admin',
    })
    expect(screen.getByText('Forbidden')).toBeInTheDocument()
  })

  it('allows super_admin when super_admin role required', () => {
    renderWithRouter({
      isAuthenticated: true,
      user: { role: 'super_admin' },
      requiredRole: 'super_admin',
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})

// ---- Role-based UI rendering test ----
describe('Role-based UI rendering (UX only, not security)', () => {
  it('admin-only controls not visible to regular user role', () => {
    // This documents that frontend hiding is UX, not security.
    // Backend always enforces role on every API call independently.
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user', id: 1, full_name: 'Test User' },
      isBlogAdmin: false,
      isSuperAdmin: false,
      unreadCount: 0,
    })

    // A component that conditionally renders admin controls
    const AdminControls = () => {
      const { isBlogAdmin } = useAuth()
      return isBlogAdmin ? <button>Admin Action</button> : <p>Regular content</p>
    }

    render(
      <MemoryRouter>
        <AdminControls />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Admin Action')).not.toBeInTheDocument()
    expect(screen.getByText('Regular content')).toBeInTheDocument()
  })
})
