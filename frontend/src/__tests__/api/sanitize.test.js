import { describe, it, expect } from 'vitest'
import { sanitize, stripHtml } from '@/utils/sanitize'

describe('sanitize', () => {
  it('removes <script> tags (XSS prevention)', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>'
    const result = sanitize(input)
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
    expect(result).toContain('Hello')
  })

  it('removes onclick event handlers', () => {
    const input = '<p onclick="evil()">Click me</p>'
    const result = sanitize(input)
    expect(result).not.toContain('onclick')
    expect(result).toContain('Click me')
  })

  it('removes <iframe> tags', () => {
    const input = '<iframe src="http://evil.com"></iframe><p>safe</p>'
    const result = sanitize(input)
    expect(result).not.toContain('<iframe')
    expect(result).toContain('safe')
  })

  it('preserves allowed tags like <strong>, <em>, <a>', () => {
    const input = '<p><strong>Bold</strong> and <em>italic</em></p>'
    const result = sanitize(input)
    expect(result).toContain('<strong>Bold</strong>')
    expect(result).toContain('<em>italic</em>')
  })

  it('returns empty string for null/undefined input', () => {
    expect(sanitize(null)).toBe('')
    expect(sanitize(undefined)).toBe('')
    expect(sanitize('')).toBe('')
  })

  it('removes javascript: href links', () => {
    const input = '<a href="javascript:evil()">link</a>'
    const result = sanitize(input)
    expect(result).not.toContain('javascript:')
  })
})

describe('stripHtml', () => {
  it('removes all HTML tags and returns plain text', () => {
    const input = '<h1>Title</h1><p>Some <strong>bold</strong> text.</p>'
    const result = stripHtml(input)
    expect(result).not.toContain('<')
    expect(result).toContain('Title')
    expect(result).toContain('bold')
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })
})
