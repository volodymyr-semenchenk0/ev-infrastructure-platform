import { useMutation } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { components } from '@/types/api'

export type SensitivityRequest = components['schemas']['SensitivityRequest']
export type SensitivityResponse = components['schemas']['SensitivityRead']
export type ConfidenceInterval = components['schemas']['ConfidenceInterval']

interface RunSensitivityArgs {
  evaluationId: number
  body: SensitivityRequest
}

async function postSensitivity({
  evaluationId,
  body,
}: RunSensitivityArgs): Promise<SensitivityResponse> {
  const { data } = await api.post<SensitivityResponse>(
    `/evaluations/${evaluationId}/sensitivity`,
    body,
  )
  return data
}

export function useSensitivity() {
  return useMutation({ mutationFn: postSensitivity })
}
