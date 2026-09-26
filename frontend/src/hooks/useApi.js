/**
 * useApi — generic data-fetching hook
 * Wraps an API call with loading / error / data state.
 *
 * Usage:
 *   const { data, isLoading, error, refetch } = useApi(
 *     () => postsApi.list({ page: 1 }),
 *     [page]          // re-fetch when deps change
 *   )
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(apiFn, deps = []) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  // Prevent state updates on unmounted component
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiFn()
      if (mountedRef.current) setData(response.data)
    } catch (err) {
      if (mountedRef.current)
        setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    execute()
    return () => { mountedRef.current = false }
  }, [execute])

  return { data, isLoading, error, refetch: execute }
}
