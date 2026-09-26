import { describe, it, expect } from 'vitest'
import { formatDate, formatPrice, truncate, roleLabel, statusVariant } from '@/utils/formatters'

describe('formatDate', () => {
  it('formats ISO date string to readable format', () => {
    const result = formatDate('2026-07-16T08:00:00Z')
    expect(result).toMatch(/16/)
    expect(result).toMatch(/Jul/)
    expect(result).toMatch(/2026/)
  })
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })
})

describe('formatPrice', () => {
  it('formats INR price with correct symbol', () => {
    const result = formatPrice(150, 'INR')
    expect(result).toContain('150')
  })
  it('returns empty string for null', () => {
    expect(formatPrice(null)).toBe('')
  })
})

describe('truncate', () => {
  it('truncates long strings and appends ellipsis', () => {
    const long = 'a'.repeat(200)
    const result = truncate(long, 100)
    expect(result.length).toBeLessThanOrEqual(104) // 100 + '…'
    expect(result).toMatch(/…$/)
  })
  it('does not truncate short strings', () => {
    expect(truncate('short', 100)).toBe('short')
  })
  it('returns empty string for null', () => {
    expect(truncate(null)).toBe('')
  })
})

describe('roleLabel', () => {
  it('returns human-readable labels', () => {
    expect(roleLabel('user')).toBe('User')
    expect(roleLabel('blog_admin')).toBe('Blog Admin')
    expect(roleLabel('super_admin')).toBe('Super Admin')
  })
  it('returns raw value for unknown roles', () => {
    expect(roleLabel('unknown_role')).toBe('unknown_role')
  })
})

describe('statusVariant', () => {
  it('returns green badge for published/active/available', () => {
    expect(statusVariant('published')).toBe('badge-green')
    expect(statusVariant('active')).toBe('badge-green')
    expect(statusVariant('available')).toBe('badge-green')
  })
  it('returns yellow badge for pending/reserved', () => {
    expect(statusVariant('pending')).toBe('badge-yellow')
    expect(statusVariant('reserved')).toBe('badge-yellow')
  })
  it('returns red badge for rejected/cancelled', () => {
    expect(statusVariant('rejected')).toBe('badge-red')
    expect(statusVariant('cancelled')).toBe('badge-red')
  })
  it('returns gray for unknown status', () => {
    expect(statusVariant('totally_unknown')).toBe('badge-gray')
  })
})
