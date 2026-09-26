/**
 * useForm — lightweight form state + validation hook
 *
 * Usage:
 *   const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm({
 *     initialValues: { email: '', password: '' },
 *     validate: (vals) => {
 *       const errs = {}
 *       if (!vals.email) errs.email = 'Required'
 *       return errs
 *     },
 *     onSubmit: async (vals) => { ... }
 *   })
 */

import { useState, useCallback } from 'react'

export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState({})

  const handleChange = useCallback((e) => {
    const { name, value, type, checked, files } = e.target
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
    }))
    // Clear error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }, [])

  const handleBlur = useCallback((e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))
  }, [])

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault()
      const validationErrors = validate ? validate(values) : {}
      setErrors(validationErrors)
      // Mark all fields as touched on submit
      const allTouched = Object.keys(values).reduce((acc, k) => ({ ...acc, [k]: true }), {})
      setTouched(allTouched)

      if (Object.keys(validationErrors).length > 0) return

      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, validate, onSubmit],
  )

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }, [])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    reset,
  }
}
