import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Profile } from '@/store/profile-store'

async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await api.get<Profile[]>('/profiles')
  return data
}

export function useProfiles() {
  return useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles })
}
