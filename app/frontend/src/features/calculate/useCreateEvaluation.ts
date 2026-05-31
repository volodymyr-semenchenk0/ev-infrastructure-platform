import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PairwiseMatrix } from './saaty-scale'

interface CreateEvaluationPayload {
  profileId: number
  pairwiseMatrix: PairwiseMatrix
}

interface RankingItem {
  locationId: number
  rank: number
  closeness: number
  sPlus: number
  sMinus: number
}

interface FuzzyWeight {
  l: number
  m: number
  u: number
}

export interface EvaluationResponse {
  evaluationId: number
  weights: Record<string, number>
  weightsFuzzy: Record<string, FuzzyWeight> | null
  ranking: RankingItem[]
  executionTimeMs: number | null
}

async function postEvaluation(
  payload: CreateEvaluationPayload,
): Promise<EvaluationResponse> {
  const { data } = await api.post<EvaluationResponse>('/evaluations', payload)
  return data
}

export function useCreateEvaluation() {
  return useMutation({ mutationFn: postEvaluation })
}
