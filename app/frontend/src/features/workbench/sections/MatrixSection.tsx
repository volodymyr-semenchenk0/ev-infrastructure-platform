import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Download, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { computeConsistencyStats } from '@/features/calculate/consistency'
import {
  identityMatrix,
  type PairwiseMatrix,
} from '@/features/calculate/saaty-scale'
import { useCriteria } from '@/features/calculate/useCriteria'
import type { ProfileDetail } from '@/features/profiles/useProfileDetails'
import { api, NotFoundError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/store/profile-store'
import { useSessionStore, type FuzzyNumber } from '@/store/session-store'

const CR_THRESHOLD = 0.1
const CR_WARN_LIMIT = 0.15

// Count upper-triangle pairs whose modal value differs from 1 — those are the
// pairs the operator has actively set away from the «однакова важливість»
// default. Diagonal and lower triangle are skipped.
function countSetPairs(matrix: PairwiseMatrix): number {
  let count = 0
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = i + 1; j < matrix.length; j += 1) {
      if (Math.abs(matrix[i][j].m - 1) > 1e-9) {
        count += 1
      }
    }
  }
  return count
}

function getCrColor(cr: number): string {
  if (cr <= CR_THRESHOLD) return 'text-emerald-700 dark:text-emerald-300'
  if (cr <= CR_WARN_LIMIT) return 'text-amber-700 dark:text-amber-300'
  return 'text-destructive'
}

export function MatrixSection() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const pairwiseMatrix = useSessionStore((s) => s.pairwiseMatrix)
  const consistencyRatio = useSessionStore((s) => s.consistencyRatio)
  const commitMatrix = useSessionStore((s) => s.commitMatrix)
  const criteria = useCriteria()

  const [isLoadingDefault, setIsLoadingDefault] = useState(false)

  if (!activeProfile) {
    return (
      <p className="text-sm text-muted-foreground">
        Спочатку оберіть профіль ОПР у попередньому розділі.
      </p>
    )
  }

  if (criteria.isLoading || !criteria.data) {
    return <p className="text-sm text-muted-foreground">Завантаження критеріїв…</p>
  }

  const m = criteria.data.length
  const totalPairs = (m * (m - 1)) / 2
  const setPairs = pairwiseMatrix ? countSetPairs(pairwiseMatrix) : 0
  const cr = consistencyRatio ?? 0
  const canRunFahp = pairwiseMatrix !== null && cr <= CR_THRESHOLD

  const handleLoadDefault = async () => {
    setIsLoadingDefault(true)
    try {
      const { data } = await api.get<ProfileDetail>(`/profiles/${activeProfile.id}`)
      const remote = data.pairwiseMatrix as FuzzyNumber[][] | null | undefined
      if (remote && remote.length > 0) {
        const stats = computeConsistencyStats(remote)
        commitMatrix(remote, stats.cr)
        toast({ title: 'Дефолтну матрицю завантажено' })
      } else {
        const fallback = identityMatrix(m)
        commitMatrix(fallback, 0)
        toast({
          title: 'Дефолти ще не задані',
          description: 'Завантажено одиничну матрицю; відредагуйте її вручну.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      const fallback = identityMatrix(m)
      commitMatrix(fallback, 0)
      const description =
        error instanceof NotFoundError
          ? 'Профіль ще не має збереженої матриці; завантажено одиничну.'
          : 'Не вдалося завантажити дефолт; завантажено одиничну матрицю.'
      toast({ title: 'Завантаження дефолту', description, variant: 'destructive' })
    } finally {
      setIsLoadingDefault(false)
    }
  }

  const handleRunFahp = () => {
    // FAHP call lands in task 8; for now the section only enforces the CR gate.
    toast({
      title: 'FAHP ще не підключено',
      description: 'Виклик POST /api/evaluations зʼявиться на кроці 8 роадмапу.',
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-background p-3">
        <p className="text-sm">
          <span className="font-medium">{setPairs}</span>
          {' / '}
          <span className="text-muted-foreground">{totalPairs}</span> пар задано
        </p>
        <p className="mt-1 text-sm">
          CR ={' '}
          <span className={cn('font-semibold tabular-nums', getCrColor(cr))}>
            {pairwiseMatrix ? cr.toFixed(3) : '—'}
          </span>
        </p>
        {!pairwiseMatrix && (
          <p className="mt-2 text-xs text-muted-foreground">
            Матриця ще не задана. Завантажте дефолт або відкрийте редактор.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/details#matrix">
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Редагувати матрицю
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadDefault}
          disabled={isLoadingDefault}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {isLoadingDefault ? 'Завантаження…' : 'Завантажити дефолт профілю'}
        </Button>
        <Button
          size="sm"
          onClick={handleRunFahp}
          disabled={!canRunFahp}
          title={canRunFahp ? undefined : 'Узгодженість CR перевищує 0,10'}
        >
          <Calculator className="mr-2 h-4 w-4" aria-hidden="true" />
          Обчислити ваги
        </Button>
      </div>
    </div>
  )
}
