import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface LocationItem {
  id: number
  name: string
  address?: string | null
  district?: string | null
  latitude: number
  longitude: number
  criteriaValues?: Record<string, number> | null
}

async function fetchLocations(): Promise<LocationItem[]> {
  const { data } = await api.get<LocationItem[]>('/locations')
  return data
}

export function useLocations() {
  return useQuery({ queryKey: ['locations'], queryFn: fetchLocations })
}
