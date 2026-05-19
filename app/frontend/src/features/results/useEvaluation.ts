import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EvaluationResponse } from '@/features/calculate/useCreateEvaluation'

async function fetchEvaluation(id: number): Promise<EvaluationResponse> {
  const { data } = await api.get<EvaluationResponse>(`/evaluations/${id}`)
  return data
}

export function useEvaluation(id: number) {
  return useQuery({
    queryKey: ['evaluations', id],
    queryFn: () => fetchEvaluation(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}
