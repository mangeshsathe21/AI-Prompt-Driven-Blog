import { Helmet } from '@vuer-ai/react-helmet-async'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useForm } from '@/hooks/useForm'
import { validators } from '@/utils/validators'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: { email: '' },
    validate: (v) => {
      const err = validators.email(v.email)
      return err ? { email: err } : {}
    },
    onSubmit: async ({ email }) => {
      await authApi.forgotPassword(email)
      setSent(true)
      toast.success('Reset link sent if account exists.')
    },
  })

  return (
    <>
      <Helmet><title>Forgot Password — GreenTalk</title></Helmet>
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold mb-2 text-[var(--color-brand-dark)]">Forgot password?</h1>
          <p className="text-sm text-[var(--color-muted)] mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div className="bg-[var(--color-green-50)] border border-[var(--color-green-200)] rounded-xl p-4 text-sm text-[var(--color-brand-dark)]">
              ✅ If an account with that email exists, a password reset link has been sent. Check your inbox.
              <div className="mt-4">
                <Link to="/login" className="btn btn-primary btn-sm">Back to login</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email <span className="required" aria-hidden="true">*</span></label>
                <input
                  id="email" name="email" type="email" autoComplete="email"
                  value={values.email} onChange={handleChange} onBlur={handleBlur}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="form-error" role="alert">{errors.email}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center text-sm mt-4">
                <Link to="/login" className="text-[var(--color-brand)] hover:underline">Back to login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
