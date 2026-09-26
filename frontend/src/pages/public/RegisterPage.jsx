import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { authApi } from '@/api/auth'
import { useForm } from '@/hooks/useForm'
import { validators } from '@/utils/validators'
import toast from 'react-hot-toast'

function validate(vals) {
  const errs = {}
  const emailErr = validators.email(vals.email)
  if (emailErr) errs.email = emailErr
  if (!vals.username || vals.username.trim().length < 3) errs.username = 'Username must be at least 3 characters.'
  const pwErr = validators.passwordStrength(vals.password)
  if (pwErr) errs.password = pwErr
  const matchErr = validators.passwordMatch(vals.password)(vals.password_confirm)
  if (matchErr) errs.password_confirm = matchErr
  return errs
}

export default function RegisterPage() {
  const navigate = useNavigate()

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: { email: '', username: '', first_name: '', last_name: '', password: '', password_confirm: '' },
    validate,
    onSubmit: async (vals) => {
      try {
        await authApi.register(vals)
        toast.success('Account created! Please check your email to verify your account.')
        navigate('/login')
      } catch (err) {
        const detail = err.response?.data?.details
        if (detail) {
          Object.values(detail).flat().forEach((msg) => toast.error(String(msg)))
        }
      }
    },
  })

  return (
    <>
      <Helmet><title>Sign up — GreenTalk</title></Helmet>
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="card w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🌿</div>
            <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">Join GreenTalk</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">Create your free account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {[
              { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', required: true },
              { id: 'username', label: 'Username', type: 'text', autoComplete: 'username', required: true },
              { id: 'first_name', label: 'First name', type: 'text', autoComplete: 'given-name' },
              { id: 'last_name', label: 'Last name', type: 'text', autoComplete: 'family-name' },
              { id: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', required: true },
              { id: 'password_confirm', label: 'Confirm password', type: 'password', autoComplete: 'new-password', required: true },
            ].map(({ id, label, type, autoComplete, required }) => (
              <div key={id} className="form-group">
                <label htmlFor={id} className="form-label">
                  {label}{required && <span className="required" aria-hidden="true"> *</span>}
                </label>
                <input
                  id={id} name={id} type={type} autoComplete={autoComplete}
                  value={values[id]} onChange={handleChange} onBlur={handleBlur}
                  className={`form-input ${errors[id] ? 'error' : ''}`}
                  aria-invalid={!!errors[id]}
                  aria-describedby={errors[id] ? `${id}-error` : undefined}
                />
                {errors[id] && <p id={`${id}-error`} className="form-error" role="alert">{errors[id]}</p>}
              </div>
            ))}

            <p className="text-xs text-[var(--color-muted)] mb-4">
              Password must be at least 8 characters and not entirely numeric.
            </p>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm mt-6 text-[var(--color-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--color-brand)] font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </>
  )
}
