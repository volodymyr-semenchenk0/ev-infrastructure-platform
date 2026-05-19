import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { components } from '@/types/api'

export type ComparisonResponse = components['schemas']['ComparisonRead']
export type PairwiseDifference = components['schemas']['PairwiseDifference']

async function fetchComparison(a: number, b: number): Promise<ComparisonResponse> {
  const { data } = await api.get<ComparisonResponse>(
    `/evaluations/${a}/comparison/${b}`,
  )
  return data
}

export function useComparison(a: number | null, b: number | null) {
  return useQuery({
    queryKey: ['comparison', a, b],
    queryFn: () => fetchComparison(a as number, b as number),
    enabled: Boolean(a && b && a !== b),
  })
}
