import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Criterion {
  id: number
  code: string
  name: string
  unit: string
  optimizationType: 'max' | 'min'
  scale: string
}

async function fetchCriteria(): Promise<Criterion[]> {
  const { data } = await api.get<Criterion[]>('/criteria')
  return data
}

export function useCriteria() {
  return useQuery({ queryKey: ['criteria'], queryFn: fetchCriteria })
}
