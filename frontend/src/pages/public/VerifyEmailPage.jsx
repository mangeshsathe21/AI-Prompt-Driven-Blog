import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { authApi } from '@/api/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Invalid or expired verification link.')
      })
  }, [token])

  return (
    <>
      <Helmet><title>Verify Email — GreenTalk</title></Helmet>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-10 max-w-md w-full text-center">
          {status === 'loading' && (
            <>
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-[var(--color-muted)]">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-xl font-bold text-[var(--color-brand-dark)] mb-2">Email verified!</h1>
              <p className="text-[var(--color-muted)] mb-6">Your account is now active. Welcome to GreenTalk!</p>
              <Link to="/login" className="btn btn-primary">Log in</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h1 className="text-xl font-bold text-[var(--color-danger)] mb-2">Verification failed</h1>
              <p className="text-[var(--color-muted)] mb-6">{message}</p>
              <Link to="/login" className="btn btn-ghost">Back to login</Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
