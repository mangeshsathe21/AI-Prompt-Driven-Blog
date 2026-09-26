import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Modal from '@/components/ui/Modal'

describe('Modal', () => {
  it('does not render when isOpen=false', () => {
    render(<Modal isOpen={false} onClose={vi.fn()} title="Test"><p>content</p></Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when isOpen=true', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="My Dialog"><p>Dialog content</p></Modal>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('My Dialog')).toBeInTheDocument()
    expect(screen.getByText('Dialog content')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const mockClose = vi.fn()
    render(<Modal isOpen={true} onClose={mockClose} title="Test"><p>content</p></Modal>)
    await user.click(screen.getByLabelText('Close dialog'))
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const mockClose = vi.fn()
    render(<Modal isOpen={true} onClose={mockClose} title="Test"><p>content</p></Modal>)
    await user.keyboard('{Escape}')
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('has aria-modal="true" and aria-labelledby', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="Accessible"><p>content</p></Modal>)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
  })
})
