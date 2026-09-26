/**
 * LoginPage — email + password login with post-login redirect
 *
 * SECURITY:
 * - Redirect destination is validated to be a relative path only
 *   to prevent open-redirect attacks after login.
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useAuth } from '@/context/AuthContext'
import { useForm } from '@/hooks/useForm'
import { validators } from '@/utils/validators'
import toast from 'react-hot-toast'

function validate(vals) {
  const errs = {}
  const emailErr = validators.email(vals.email)
  if (emailErr) errs.email = emailErr
  if (!vals.password) errs.password = 'Password is required.'
  return errs
}

/** Ensure redirect URL is a safe relative path — prevent open redirect */
function safePath(path) {
  if (!path || typeof path !== 'string') return '/'
  if (path.startsWith('//') || /^https?:\/\//i.test(path)) return '/'
  return path
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from = safePath(location.state?.from?.pathname)

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: { email: '', password: '' },
    validate,
    onSubmit: async ({ email, password }) => {
      try {
        await login(email, password)
        toast.success('Welcome back!')
        navigate(from, { replace: true })
      } catch (err) {
        const msg = err.response?.data?.message || 'Invalid email or password.'
        toast.error(msg)
      }
    },
  })

  return (
    <>
      <Helmet>
        <title>Log in — GreenTalk</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-[var(--color-bg)]">
        <div className="card w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🌱</div>
            <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">Welcome back</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Log in to your GreenTalk account
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${errors.email ? 'error' : ''}`}
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                required
              />
              {errors.email && <p id="email-error" className="form-error" role="alert">{errors.email}</p>}
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="form-label">
                  Password <span className="required" aria-hidden="true">*</span>
                </label>
                <Link to="/forgot-password" className="text-xs text-[var(--color-brand)] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${errors.password ? 'error' : ''}`}
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                required
              />
              {errors.password && <p id="password-error" className="form-error" role="alert">{errors.password}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full mt-2">
              {isSubmitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm mt-6 text-[var(--color-muted)]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--color-brand)] font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
