import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with role="status" and accessible label', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('applies sm size class', () => {
    render(<LoadingSpinner size="sm" />)
    const el = screen.getByRole('status')
    expect(el.className).toMatch(/w-4/)
  })

  it('applies lg size class', () => {
    render(<LoadingSpinner size="lg" />)
    const el = screen.getByRole('status')
    expect(el.className).toMatch(/w-12/)
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    const el = screen.getByRole('status')
    expect(el.className).toMatch(/custom-class/)
  })
})
