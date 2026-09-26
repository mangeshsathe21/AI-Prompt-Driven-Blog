import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { authApi } from '@/api/auth'
import { useForm } from '@/hooks/useForm'
import { validators } from '@/utils/validators'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: { new_password: '', new_password_confirm: '' },
    validate: (v) => {
      const errs = {}
      const pwErr = validators.passwordStrength(v.new_password)
      if (pwErr) errs.new_password = pwErr
      const matchErr = validators.passwordMatch(v.new_password)(v.new_password_confirm)
      if (matchErr) errs.new_password_confirm = matchErr
      return errs
    },
    onSubmit: async ({ new_password, new_password_confirm }) => {
      if (!token) { toast.error('Invalid reset link.'); return }
      await authApi.resetPassword(token, new_password, new_password_confirm)
      toast.success('Password reset! Please log in.')
      navigate('/login')
    },
  })

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center max-w-sm">
        <p className="text-[var(--color-danger)] font-semibold mb-4">Invalid or missing reset token.</p>
        <Link to="/forgot-password" className="btn btn-primary">Request a new link</Link>
      </div>
    </div>
  )

  return (
    <>
      <Helmet><title>Reset Password — GreenTalk</title></Helmet>
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold mb-6 text-[var(--color-brand-dark)]">Set new password</h1>
          <form onSubmit={handleSubmit} noValidate>
            {[
              { id: 'new_password', label: 'New password' },
              { id: 'new_password_confirm', label: 'Confirm new password' },
            ].map(({ id, label }) => (
              <div key={id} className="form-group">
                <label htmlFor={id} className="form-label">{label} <span className="required" aria-hidden="true">*</span></label>
                <input
                  id={id} name={id} type="password" autoComplete="new-password"
                  value={values[id]} onChange={handleChange} onBlur={handleBlur}
                  className={`form-input ${errors[id] ? 'error' : ''}`}
                  aria-invalid={!!errors[id]}
                />
                {errors[id] && <p className="form-error" role="alert">{errors[id]}</p>}
              </div>
            ))}
            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
