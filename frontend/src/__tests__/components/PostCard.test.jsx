import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PostCard from '@/components/blog/PostCard'

const mockPost = {
  id: 1,
  slug: 'test-post',
  title: 'Getting Started with Balcony Gardening',
  excerpt: 'Learn how to start a thriving balcony garden.',
  author: { id: 3, username: 'rahul_green', full_name: 'Rahul Verma', role: 'user', created_at: '2026-01-01T00:00:00Z' },
  category: { id: 1, name: 'Home Gardening', slug: 'home-gardening' },
  featured_image_url: null,
  views_count: 142,
  like_count: 5,
  comment_count: 3,
  published_at: '2026-07-16T08:00:00Z',
  status: 'published',
}

function wrap(ui) {
  return <MemoryRouter>{ui}</MemoryRouter>
}

describe('PostCard', () => {
  it('renders post title as a link', () => {
    render(wrap(<PostCard post={mockPost} />))
    expect(screen.getByRole('link', { name: /Getting Started/i })).toBeInTheDocument()
  })

  it('links to /blog/<slug>', () => {
    render(wrap(<PostCard post={mockPost} />))
    const link = screen.getByRole('link', { name: /Getting Started/i })
    expect(link.getAttribute('href')).toBe('/blog/test-post')
  })

  it('shows category badge', () => {
    render(wrap(<PostCard post={mockPost} />))
    expect(screen.getByText('Home Gardening')).toBeInTheDocument()
  })

  it('shows author name', () => {
    render(wrap(<PostCard post={mockPost} />))
    expect(screen.getByText('Rahul Verma')).toBeInTheDocument()
  })

  it('shows view and like counts', () => {
    render(wrap(<PostCard post={mockPost} />))
    expect(screen.getByLabelText(/142 views/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/5 likes/i)).toBeInTheDocument()
  })

  it('shows status badge for non-published posts', () => {
    const pendingPost = { ...mockPost, status: 'pending' }
    render(wrap(<PostCard post={pendingPost} />))
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('does not show status badge for published posts', () => {
    render(wrap(<PostCard post={mockPost} />))
    expect(screen.queryByText('published')).not.toBeInTheDocument()
  })
})
