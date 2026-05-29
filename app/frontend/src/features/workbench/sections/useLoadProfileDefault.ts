import { useCallback } from 'react'

import { toast } from '@/components/ui/use-toast'
import { computeConsistencyStats } from '@/features/calculate/consistency'
import { identityMatrix } from '@/features/calculate/saaty-scale'
import { useCriteria } from '@/features/calculate/useCriteria'
import type { ProfileDetail } from '@/features/profiles/useProfileDetails'
import { api, NotFoundError } from '@/lib/api'
import { useSessionStore, type FuzzyNumber } from '@/store/session-store'

interface LoadOptions {
  // Set to true when a higher-level action already gives the operator
  // feedback (e.g. choosing a profile). The success path stays silent;
  // failure paths still toast because the operator needs to know the
  // matrix fell back to identity.
  silentSuccess?: boolean
}

export type LoadOutcome =
  | { ok: true; source: 'remote' }
  | { ok: false; source: 'identity'; reason: 'no-default' | 'not-found' | 'error' }

// Single source of truth for loading the default pairwise matrix Ã from
// `GET /api/profiles/{id}` and committing it to the session store. The
// 404/null/error branches mirror UI_PLAN §4: the operator never ends up
// without a matrix — identity matrix is the universal fallback.
export function useLoadProfileDefault() {
  const commitMatrix = useSessionStore((s) => s.commitMatrix)
  const criteria = useCriteria()

  return useCallback(
    async (profileId: number, opts: LoadOptions = {}): Promise<LoadOutcome> => {
      const fallbackSize = criteria.data?.length ?? 9

      const commitIdentity = (reason: 'no-default' | 'not-found' | 'error') => {
        commitMatrix(identityMatrix(fallbackSize), 0)
        return { ok: false as const, source: 'identity' as const, reason }
      }

      try {
        const { data } = await api.get<ProfileDetail>(`/profiles/${profileId}`)
        const remote = data.pairwiseMatrix as FuzzyNumber[][] | null | undefined
        if (remote && remote.length > 0) {
          const stats = computeConsistencyStats(remote)
          commitMatrix(remote, stats.cr)
          if (!opts.silentSuccess) {
            toast({ title: 'Дефолтну матрицю завантажено' })
          }
          return { ok: true, source: 'remote' }
        }
        toast({
          title: 'Дефолти ще не задані',
          description: 'Завантажено одиничну матрицю; відредагуйте її вручну.',
          variant: 'destructive',
        })
        return commitIdentity('no-default')
      } catch (error) {
        const description =
          error instanceof NotFoundError
            ? 'Профіль ще не має збереженої матриці; завантажено одиничну.'
            : 'Не вдалося завантажити дефолт; завантажено одиничну матрицю.'
        toast({
          title: 'Завантаження дефолту',
          description,
          variant: 'destructive',
        })
        return commitIdentity(
          error instanceof NotFoundError ? 'not-found' : 'error',
        )
      }
    },
    [commitMatrix, criteria.data],
  )
}
