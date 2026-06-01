import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { components } from '@/types/api'

export type ProfileComparisonResponse = components['schemas']['ProfileComparisonRead']
export type ComparisonResult = components['schemas']['ComparisonRead']
export type PairwiseDifference = components['schemas']['PairwiseDifference']

async function fetchProfileComparison(
  profileA?: number,
  profileB?: number,
): Promise<ProfileComparisonResponse> {
  const params: Record<string, number> = {}
  if (profileA != null) params.profile_a = profileA
  if (profileB != null) params.profile_b = profileB
  const { data } = await api.get<ProfileComparisonResponse>('/profiles/comparison', { params })
  return data
}

// Canonical comparison of two profiles from their default pairwise matrices.
// With no ids the backend uses the two standard profiles (municipal, investor).
// Disabled by default; the section triggers it via refetch() so the step behaves
// as a plain button rather than auto-running on mount.
export function useProfileComparison(profileA?: number, profileB?: number) {
  return useQuery({
    queryKey: ['profile-comparison', profileA ?? null, profileB ?? null],
    queryFn: () => fetchProfileComparison(profileA, profileB),
    enabled: false,
  })
}
