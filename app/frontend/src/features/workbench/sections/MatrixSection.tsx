import { Link } from 'react-router-dom'
import { Calculator, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { type PairwiseMatrix } from '@/features/calculate/saaty-scale'
import { useCreateEvaluation } from '@/features/calculate/useCreateEvaluation'
import { useCriteria } from '@/features/calculate/useCriteria'
import { ValidationError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/store/profile-store'
import { useSessionStore } from '@/store/session-store'

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
  const setWeights = useSessionStore((s) => s.setWeights)
  const setRanking = useSessionStore((s) => s.setRanking)
  const setEvaluationId = useSessionStore((s) => s.setEvaluationId)
  const setError = useSessionStore((s) => s.setError)
  const criteria = useCriteria()
  const createEvaluation = useCreateEvaluation()

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

  const handleRunFahp = async () => {
    if (!pairwiseMatrix) return
    try {
      const result = await createEvaluation.mutateAsync({
        profileId: activeProfile.id,
        pairwiseMatrix: pairwiseMatrix as PairwiseMatrix,
      })
      // POST /api/evaluations computes FAHP and TOPSIS in one round-trip.
      // We persist the CR currently in the session (computed by the editor)
      // because the backend response does not echo it.
      setWeights(result.weights, consistencyRatio ?? 0)
      setRanking(result.ranking)
      setEvaluationId(result.evaluationId)
      setError(null)
      toast({
        title: 'Ваги обчислено',
        description: `Сеанс №${result.evaluationId}, виконано за ${result.executionTimeMs ?? '?'} мс.`,
      })
    } catch (error) {
      const description =
        error instanceof ValidationError
          ? error.detail
          : 'Не вдалося обчислити ваги. Перевірте матрицю та зʼєднання.'
      setError({ message: description, source: 'fahp' })
      toast({ title: 'Помилка FAHP', description, variant: 'destructive' })
    }
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
          size="sm"
          onClick={handleRunFahp}
          disabled={!canRunFahp || createEvaluation.isPending}
          title={canRunFahp ? undefined : 'Узгодженість CR перевищує 0,10'}
        >
          <Calculator className="mr-2 h-4 w-4" aria-hidden="true" />
          {createEvaluation.isPending ? 'Обчислення…' : 'Обчислити ваги'}
        </Button>
      </div>
    </div>
  )
}
