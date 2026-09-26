import { Helmet } from '@vuer-ai/react-helmet-async'
import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <>
      <Helmet><title>403 Forbidden — GreenTalk</title></Helmet>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-4">
        <div className="text-7xl">🚫</div>
        <h1 className="text-4xl font-bold text-[var(--color-danger)]">403</h1>
        <p className="text-xl text-[var(--color-muted)]">You don't have permission to view this page.</p>
        <Link to="/" className="btn btn-primary mt-2">Go home</Link>
      </div>
    </>
  )
}
