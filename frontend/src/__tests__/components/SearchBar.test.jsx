import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import SearchBar from '@/components/ui/SearchBar'

describe('SearchBar', () => {
  it('renders input with accessible label', () => {
    render(<SearchBar value="" onChange={vi.fn()} placeholder="Search posts…" />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const user = userEvent.setup()
    const mockChange = vi.fn()
    render(<SearchBar value="" onChange={mockChange} />)
    await user.type(screen.getByRole('searchbox'), 'neem')
    expect(mockChange).toHaveBeenCalled()
  })

  it('calls onSubmit when form is submitted', () => {
    const mockSubmit = vi.fn()
    render(<SearchBar value="tulsi" onChange={vi.fn()} onSubmit={mockSubmit} />)
    fireEvent.submit(screen.getByRole('search'))
    expect(mockSubmit).toHaveBeenCalledWith('tulsi')
  })

  it('renders submit button with accessible label', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Submit search')).toBeInTheDocument()
  })
})
