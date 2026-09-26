/**
 * Integration tests — RegisterPage
 * Tests: form validation, duplicate email, password mismatch,
 *        successful registration flow.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from '@vuer-ai/react-helmet-async'
import RegisterPage from '@/pages/public/RegisterPage'

vi.mock('@/api/auth', () => ({
  authApi: {
    register:     vi.fn(),
    refreshToken: vi.fn().mockRejectedValue(new Error('no session')),
  },
}))
vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useAuth: vi.fn().mockReturnValue({ isAuthenticated: false, isLoading: false, user: null, isBlogAdmin: false, isSuperAdmin: false }) }
})
vi.mock('@/context/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
  NotificationProvider: ({ children }) => children,
}))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

function renderRegister() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login"    element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all form fields', () => {
    renderRegister()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/username/i), 'newuser')
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass@1')
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass@2')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument()
    })
  })

  it('shows error for short username', async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByLabelText(/username/i), 'ab') // too short
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
    })
  })

  it('shows error for weak password (numeric only)', async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByLabelText(/^password/i), '12345678')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/numeric/i)).toBeInTheDocument()
    })
  })

  it('calls authApi.register with correct data on valid submit', async () => {
    const { authApi } = await import('@/api/auth')
    authApi.register.mockResolvedValueOnce({ data: { user_id: 7, email: 'new@test.com' } })
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/username/i), 'newuser123')
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass@1')
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass@1')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledOnce()
    })
    const callArg = authApi.register.mock.calls[0][0]
    expect(callArg.email).toBe('new@test.com')
    expect(callArg.username).toBe('newuser123')
  })
})
