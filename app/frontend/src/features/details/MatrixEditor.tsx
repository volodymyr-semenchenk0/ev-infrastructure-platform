import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RotateCcw, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AhpMatrix } from '@/features/calculate/AhpMatrix'
import {
  computeConsistencyStats,
  findInconsistentPairs,
} from '@/features/calculate/consistency'
import {
  identityMatrix,
  type PairwiseMatrix,
} from '@/features/calculate/saaty-scale'
import { useCriteria } from '@/features/calculate/useCriteria'
import { useSessionStore } from '@/store/session-store'

const CR_THRESHOLD = 0.1
const INCONSISTENT_PAIRS_COUNT = 3

const SAATY_LEGEND: ReadonlyArray<readonly [string, string]> = [
  ['1', 'однакова важливість'],
  ['3', 'помірна перевага'],
  ['5', 'істотна перевага'],
  ['7', 'значна перевага'],
  ['9', 'абсолютна перевага'],
  ['1/3 … 1/9', 'обернені значення для протилежної переваги'],
]

function formatStat(value: number, fractionDigits = 3): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(fractionDigits)
}

function getCrColor(cr: number): string {
  if (cr <= CR_THRESHOLD) return 'text-emerald-700 dark:text-emerald-300'
  if (cr <= 0.15) return 'text-amber-700 dark:text-amber-300'
  return 'text-destructive'
}

export function MatrixEditor() {
  const navigate = useNavigate()
  const criteria = useCriteria()
  const storedMatrix = useSessionStore((s) => s.pairwiseMatrix)
  const commitMatrix = useSessionStore((s) => s.commitMatrix)

  const [matrix, setMatrix] = useState<PairwiseMatrix | null>(storedMatrix)

  // Lazily seed local matrix from criteria size if the store is still empty
  // (first visit before "Завантажити дефолт профілю" runs).
  useEffect(() => {
    if (matrix !== null) return
    if (storedMatrix !== null) {
      setMatrix(storedMatrix)
      return
    }
    if (criteria.data) {
      setMatrix(identityMatrix(criteria.data.length))
    }
  }, [matrix, storedMatrix, criteria.data])

  const stats = useMemo(
    () => (matrix ? computeConsistencyStats(matrix) : null),
    [matrix],
  )

  const inconsistentPairs = useMemo(() => {
    if (!matrix || !stats) return []
    if (stats.cr <= CR_THRESHOLD) return []
    return findInconsistentPairs(matrix, INCONSISTENT_PAIRS_COUNT)
  }, [matrix, stats])

  const highlightPairs = useMemo(
    () => inconsistentPairs.map((p) => [p.i, p.j] as const),
    [inconsistentPairs],
  )

  const handleReset = () => {
    if (criteria.data) {
      setMatrix(identityMatrix(criteria.data.length))
    }
  }

  const handleSave = () => {
    if (!matrix || !stats) return
    commitMatrix(matrix, stats.cr)
    navigate('/')
  }

  if (criteria.isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (criteria.isError || !criteria.data) {
    return (
      <p className="text-sm text-destructive">
        Не вдалося завантажити перелік критеріїв.
      </p>
    )
  }

  if (!matrix || !stats) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Редактор матриці $\tilde{'{'}A{'}'}$</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Верхній трикутник редагується значеннями шкали Сааті; нижній –
            автоматично обернений TFN за формулою (1.6); діагональ – (1, 1, 1).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            До панелі
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Скинути до дефолту
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            Зберегти та закрити
          </Button>
        </div>
      </header>

      <section
        aria-label="Статистика узгодженості"
        className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-4"
      >
        <Stat label="λ_max" value={formatStat(stats.lambdaMax)} />
        <Stat label="CI" value={formatStat(stats.ci)} />
        <Stat label={`RI (n=${matrix.length})`} value={formatStat(stats.ri, 2)} />
        <Stat
          label="CR"
          value={formatStat(stats.cr)}
          className={getCrColor(stats.cr)}
        />
      </section>

      <details className="rounded-md border bg-background p-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          Шкала Сааті
        </summary>
        <dl className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
          {SAATY_LEGEND.map(([key, description]) => (
            <div key={key} className="flex gap-2">
              <dt className="font-mono font-medium">{key}</dt>
              <dd className="text-muted-foreground">{description}</dd>
            </div>
          ))}
        </dl>
      </details>

      <AhpMatrix
        criteria={criteria.data}
        matrix={matrix}
        onChange={setMatrix}
        highlightPairs={highlightPairs}
      />

      {stats.cr > CR_THRESHOLD && inconsistentPairs.length > 0 && (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100"
        >
          CR перевищує 0,10. Найбільший внесок у неузгодженість дають пари:{' '}
          {inconsistentPairs
            .map(({ i, j }) => `${criteria.data[i].code}/${criteria.data[j].code}`)
            .join(', ')}
          . Перегляньте їх перед збереженням.
        </p>
      )}
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  className?: string
}

function Stat({ label, value, className }: StatProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-base font-semibold tabular-nums ${className ?? ''}`}>
        {value}
      </p>
    </div>
  )
}
