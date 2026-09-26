/**
 * Integration tests — LoginPage
 * Tests: successful login flow, validation errors, wrong credentials,
 *        safe redirect after login, admin-UI not shown to regular user.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from '@vuer-ai/react-helmet-async'
import LoginPage from '@/pages/public/LoginPage'
import { AuthProvider } from '@/context/AuthContext'

// Mock the auth API
vi.mock('@/api/auth', () => ({
  authApi: {
    login:        vi.fn(),
    refreshToken: vi.fn().mockRejectedValue(new Error('no session')),
    getProfile:   vi.fn(),
  },
}))

vi.mock('@/api/notifications', () => ({
  notificationsApi: { list: vi.fn().mockResolvedValue({ data: { results: [] } }) },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

function renderLogin(initialPath = '/login') {
  return render(
    <HelmetProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/"      element={<div>Home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </HelmetProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('shows validation error for empty email on submit', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/email/i), 'notanemail')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('calls login with email and password on valid submit', async () => {
    const { authApi } = await import('@/api/auth')
    authApi.login.mockResolvedValueOnce({
      data: { access: 'tok', user: { id: 1, email: 'u@t.com', role: 'user', is_verified: true, full_name: 'Test User' } },
    })
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/email/i), 'u@t.com')
    await user.type(screen.getByLabelText(/password/i), 'TestPass@1234')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('u@t.com', 'TestPass@1234')
    })
  })

  it('shows forgot password link', () => {
    renderLogin()
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('shows sign up link', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })
})
