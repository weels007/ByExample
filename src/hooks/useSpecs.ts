import { useCallback, useEffect, useState } from 'react'

import { friendlyContractError } from '../lib/errors'
import { IS_REGISTRY_CONFIGURED, fetchSpecCount, fetchSpecSummaries } from '../lib/genlayer'
import type { SpecSummary } from '../lib/types'

export type SpecsState = {
  summaries: SpecSummary[]
  count: number | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSpecs(): SpecsState {
  const [summaries, setSummaries] = useState<SpecSummary[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!IS_REGISTRY_CONFIGURED) {
      setSummaries([])
      setCount(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    try {
      const [nextSummaries, nextCount] = await Promise.all([fetchSpecSummaries(), fetchSpecCount()])
      setSummaries(nextSummaries)
      setCount(nextCount)
      setError(null)
    } catch (caught) {
      setError(friendlyContractError(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { summaries, count, loading, error, refresh }
}
