import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Pagination from '@/components/ui/Pagination'

describe('Pagination', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders page buttons for small page count', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument()
  })

  it('calls onPageChange with correct page number', () => {
    const mockChange = vi.fn()
    render(<Pagination currentPage={1} totalPages={5} onPageChange={mockChange} />)
    fireEvent.click(screen.getByLabelText('Page 3'))
    expect(mockChange).toHaveBeenCalledWith(3)
  })

  it('disables Previous button on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('disables Next button on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('marks current page with aria-current="page"', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Page 2').getAttribute('aria-current')).toBe('page')
  })

  it('renders ellipsis for large page counts', () => {
    render(<Pagination currentPage={5} totalPages={20} onPageChange={vi.fn()} />)
    const ellipses = screen.getAllByText('…')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })
})
