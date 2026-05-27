import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { components } from '@/types/api'

export type ProfileDetail = components['schemas']['ProfileDetailRead']

async function fetchProfileDetails(profileId: number): Promise<ProfileDetail> {
  const { data } = await api.get<ProfileDetail>(`/profiles/${profileId}`)
  return data
}

export function useProfileDetails(profileId: number | null) {
  return useQuery({
    queryKey: ['profile-details', profileId],
    queryFn: () => fetchProfileDetails(profileId as number),
    enabled: profileId !== null,
    // Default matrices change rarely and refetch on focus has no value here.
    staleTime: 5 * 60 * 1000,
  })
}
