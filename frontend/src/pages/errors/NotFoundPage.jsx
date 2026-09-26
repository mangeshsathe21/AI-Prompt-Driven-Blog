import { Helmet } from '@vuer-ai/react-helmet-async'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <Helmet><title>404 Not Found — GreenTalk</title></Helmet>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-4">
        <div className="text-7xl">🌵</div>
        <h1 className="text-4xl font-bold text-[var(--color-brand-dark)]">404</h1>
        <p className="text-xl text-[var(--color-muted)]">This page doesn't exist.</p>
        <Link to="/" className="btn btn-primary mt-2">Go home</Link>
      </div>
    </>
  )
}
