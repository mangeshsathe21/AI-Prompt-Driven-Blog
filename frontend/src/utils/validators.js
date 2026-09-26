/**
 * GreenTalk — Client-side Form Validators
 * NOTE: These complement, but do NOT replace, server-side validation.
 */

export const validators = {
  required: (val) => (!val || String(val).trim() === '' ? 'This field is required.' : undefined),

  email: (val) => {
    if (!val) return 'Email is required.'
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? undefined : 'Enter a valid email address.'
  },

  minLength: (min) => (val) =>
    val && val.length < min ? `Must be at least ${min} characters.` : undefined,

  maxLength: (max) => (val) =>
    val && val.length > max ? `Must be at most ${max} characters.` : undefined,

  passwordStrength: (val) => {
    if (!val) return 'Password is required.'
    if (val.length < 8) return 'Password must be at least 8 characters.'
    if (/^\d+$/.test(val)) return 'Password cannot be entirely numeric.'
    return undefined
  },

  passwordMatch: (password) => (val) =>
    val !== password ? 'Passwords do not match.' : undefined,

  positiveNumber: (val) =>
    val !== '' && (isNaN(val) || Number(val) < 0) ? 'Must be a positive number.' : undefined,

  url: (val) => {
    if (!val) return undefined
    try { new URL(val); return undefined } catch { return 'Enter a valid URL.' }
  },

  imageFile: (file) => {
    if (!file) return undefined
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const MAX_MB = 5
    if (!ALLOWED.includes(file.type)) return 'Only JPG, PNG, WebP, or GIF allowed.'
    if (file.size > MAX_MB * 1024 * 1024) return `Image must be under ${MAX_MB} MB.`
    return undefined
  },
}

/** Run a set of validators and return the first error (or undefined) */
export function runValidators(value, ...fns) {
  for (const fn of fns) {
    const err = fn(value)
    if (err) return err
  }
  return undefined
}
