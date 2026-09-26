import { describe, it, expect } from 'vitest'
import { validators, runValidators } from '@/utils/validators'

describe('validators.email', () => {
  it('returns error for empty string', () => {
    expect(validators.email('')).toBeTruthy()
  })
  it('returns error for invalid format', () => {
    expect(validators.email('notanemail')).toBeTruthy()
    expect(validators.email('no@')).toBeTruthy()
  })
  it('returns undefined for valid email', () => {
    expect(validators.email('user@example.com')).toBeUndefined()
  })
})

describe('validators.passwordStrength', () => {
  it('rejects empty password', () => {
    expect(validators.passwordStrength('')).toBeTruthy()
  })
  it('rejects password shorter than 8 chars', () => {
    expect(validators.passwordStrength('abc')).toBeTruthy()
  })
  it('rejects all-numeric password', () => {
    expect(validators.passwordStrength('12345678')).toBeTruthy()
  })
  it('accepts strong password', () => {
    expect(validators.passwordStrength('StrongPass@1')).toBeUndefined()
  })
})

describe('validators.passwordMatch', () => {
  it('returns error when passwords differ', () => {
    expect(validators.passwordMatch('abc')('xyz')).toBeTruthy()
  })
  it('returns undefined when passwords match', () => {
    expect(validators.passwordMatch('same')('same')).toBeUndefined()
  })
})

describe('validators.positiveNumber', () => {
  it('returns error for negative number', () => {
    expect(validators.positiveNumber('-10')).toBeTruthy()
  })
  it('returns undefined for zero', () => {
    expect(validators.positiveNumber('0')).toBeUndefined()
  })
  it('returns undefined for positive number', () => {
    expect(validators.positiveNumber('150')).toBeUndefined()
  })
})

describe('validators.imageFile', () => {
  it('returns error for disallowed MIME type', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' })
    expect(validators.imageFile(file)).toBeTruthy()
  })
  it('returns error for file over 5MB', () => {
    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    expect(validators.imageFile(big)).toBeTruthy()
  })
  it('returns undefined for valid small jpeg', () => {
    const small = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    expect(validators.imageFile(small)).toBeUndefined()
  })
  it('returns undefined for null (optional field)', () => {
    expect(validators.imageFile(null)).toBeUndefined()
  })
})

describe('validators.required', () => {
  it('returns error for empty string', () => {
    expect(validators.required('')).toBeTruthy()
    expect(validators.required('  ')).toBeTruthy()
  })
  it('returns undefined for non-empty string', () => {
    expect(validators.required('hello')).toBeUndefined()
  })
})

describe('runValidators', () => {
  it('returns first error from chain', () => {
    const result = runValidators(
      '',
      validators.required,
      validators.email,
    )
    expect(result).toBeTruthy()
  })
  it('returns undefined when all validators pass', () => {
    const result = runValidators('user@example.com', validators.email)
    expect(result).toBeUndefined()
  })
})
