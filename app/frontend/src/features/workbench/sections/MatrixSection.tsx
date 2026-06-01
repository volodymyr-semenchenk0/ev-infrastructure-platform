import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, HelpCircle, Info as InfoIcon, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Info } from '@/components/ui/info'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/components/ui/use-toast'
import { AhpMatrix } from '@/features/calculate/AhpMatrix'
import { computeConsistencyStats, findInconsistentPairs } from '@/features/calculate/consistency'
import { type PairwiseMatrix } from '@/features/calculate/saaty-scale'
import { useCreateEvaluation } from '@/features/calculate/useCreateEvaluation'
import { useCriteria } from '@/features/calculate/useCriteria'
import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { ValidationError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/store/profile-store'
import { useSessionStore } from '@/store/session-store'

import { useLoadProfileDefault } from './useLoadProfileDefault'

const CR_THRESHOLD = 0.1
const CR_WARN_LIMIT = 0.15
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
  if (cr <= CR_WARN_LIMIT) return 'text-amber-700 dark:text-amber-300'
  return 'text-destructive'
}

export function MatrixSection() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const storedMatrix = useSessionStore((s) => s.pairwiseMatrix)
  const commitMatrix = useSessionStore((s) => s.commitMatrix)
  const setWeights = useSessionStore((s) => s.setWeights)
  const setPendingRanking = useSessionStore((s) => s.setPendingRanking)
  const setEvaluationId = useSessionStore((s) => s.setEvaluationId)
  const setError = useSessionStore((s) => s.setError)
  const criteria = useCriteria()
  const createEvaluation = useCreateEvaluation()
  const loadProfileDefault = useLoadProfileDefault()

  // Local matrix is the editor's working copy. Edits live here (via AhpMatrix
  // onChange) and only reach the session store on "Обчислити ваги" or a
  // default-load/reset — so editing never wipes downstream weights mid-session.
  const [matrix, setMatrix] = useState<PairwiseMatrix | null>(storedMatrix)

  // Resync the working copy whenever the *stored* matrix reference changes
  // (a fresh default load, a reset, or a commit). Local edits change only
  // `matrix`, not `storedMatrix`, so they never trigger a resync and are never
  // clobbered. Comparing by reference is what distinguishes "operator edited"
  // from "a new matrix was committed to the session".
  const lastSyncedRef = useRef<PairwiseMatrix | null>(storedMatrix)
  useEffect(() => {
    if (storedMatrix !== lastSyncedRef.current) {
      lastSyncedRef.current = storedMatrix
      if (storedMatrix !== null) setMatrix(storedMatrix)
    }
  }, [storedMatrix])

  // Self-load the default Ã if the section mounts with a profile selected but
  // no matrix in the session (e.g. re-selecting the same profile after a
  // resetSession). ProfileSection also fires this on profile switch; the
  // per-profile ref guard prevents a duplicate in-flight request.
  const requestedRef = useRef<number | null>(null)
  useEffect(() => {
    if (!activeProfile) {
      requestedRef.current = null
      return
    }
    if (storedMatrix !== null) return
    if (requestedRef.current === activeProfile.id) return
    requestedRef.current = activeProfile.id
    void loadProfileDefault(activeProfile.id, { silentSuccess: true })
  }, [activeProfile, storedMatrix, loadProfileDefault])

  const stats = useMemo(() => (matrix ? computeConsistencyStats(matrix) : null), [matrix])

  const inconsistentPairs = useMemo(() => {
    if (!matrix || !stats) return []
    if (stats.cr <= CR_THRESHOLD) return []
    return findInconsistentPairs(matrix, INCONSISTENT_PAIRS_COUNT)
  }, [matrix, stats])

  const highlightPairs = useMemo(
    () => inconsistentPairs.map((p) => [p.i, p.j] as const),
    [inconsistentPairs]
  )

  const csvRows = useMemo(() => {
    if (!matrix || !criteria.data) {
      return [] as ReadonlyArray<ReadonlyArray<string | number>>
    }
    const rows: Array<Array<string | number>> = [['i_code', 'j_code', 'l', 'm', 'u']]
    for (let i = 0; i < matrix.length; i += 1) {
      for (let j = 0; j < matrix.length; j += 1) {
        const tfn = matrix[i][j]
        rows.push([criteria.data[i].code, criteria.data[j].code, tfn.l, tfn.m, tfn.u])
      }
    }
    return rows
  }, [matrix, criteria.data])

  const jsonPayload = useMemo(
    () => ({
      criteria: criteria.data?.map((c) => c.code) ?? [],
      matrix,
      consistencyRatio: stats?.cr ?? null,
    }),
    [criteria.data, matrix, stats]
  )

  if (!activeProfile) {
    return <Info>Оберіть профіль ОПР для переходу до матриці нечітких попарних порівнянь.</Info>
  }

  if (criteria.isLoading || !criteria.data) {
    return <p className="text-sm text-muted-foreground">Завантаження критеріїв…</p>
  }

  if (!matrix || !stats) {
    return <Skeleton className="h-96 w-full" />
  }

  // Reset reloads the profile default Ã (built server-side from
  // PAIRWISE_PRIORITIES). Non-silent so the operator gets a confirmation
  // toast; the resync effect picks up the freshly committed matrix.
  const handleReset = () => {
    void loadProfileDefault(activeProfile.id)
  }

  // Compute weights using the LOCAL matrix (whatever is in the editor right
  // now). We commit it to the session store first so downstream consumers
  // (status badges, MapPane, exports) see the same values as the API call.
  const handleRunFahp = async () => {
    if (!matrix || !stats) return
    commitMatrix(matrix, stats.cr)
    try {
      const result = await createEvaluation.mutateAsync({
        profileId: activeProfile.id,
        pairwiseMatrix: matrix,
      })
      setWeights(result.weights, stats.cr, result.weightsFuzzy)
      // Hold the TOPSIS ranking — the ranking step stays empty until the
      // operator runs ranking from the weights step.
      setPendingRanking(result.ranking)
      setEvaluationId(result.evaluationId)
      setError(null)
      toast({
        title: 'Ваги обчислено',
        description: `Виконано за ${result.executionTimeMs ?? '?'} мс.`,
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

  const canRunFahp = stats.cr <= CR_THRESHOLD

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Нечітка матриця попарних порівнянь</h3>
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <p className="max-w-[600px] text-sm text-muted-foreground">
            Значення в клітинці a_ij показує, наскільки критерій рядка важливіший за критерій
            колонки (читається «рядок відносно колонки»). Якщо число більше за 1 – критерій рядка
            переважає, якщо менше 1 – переважає критерій колонки, а 1 означає рівнозначність. Уся
            головна діагональ дорівнює 1, оскільки критерій порівнюється сам із собою. Матриця
            обернено-симетрична: значення в дзеркальній клітинці a_ji дорівнює 1/a_ij, тому при
            зміні одного відношення зворотне перераховується автоматично. Оцінки задаються за шкалою
            Сааті від 1 (рівнозначність) до 9 (абсолютна перевага).
          </p>
          <div className="border-t pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              Шкала Сааті
            </h4>
            <dl className="mt-3 grid gap-1 text-xs">
              {SAATY_LEGEND.map(([key, description]) => (
                <div key={key} className="flex gap-2">
                  <dt className="font-mono font-medium">{key}</dt>
                  <dd className="text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={150}>
        <section
          aria-label="Статистика узгодженості"
          className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-4"
        >
          <Stat
            label="λ_max"
            value={formatStat(stats.lambdaMax)}
            info="Максимальне власне значення матриці попарних порівнянь, на якому ґрунтується оцінка її узгодженості."
          />
          <Stat
            label="CI"
            value={formatStat(stats.ci)}
            info="Індекс узгодженості, що дорівнює (λ_max − n) поділеному на (n − 1) і показує, наскільки матриця відхиляється від ідеально узгодженої."
          />
          <Stat
            label={`RI (n=${matrix.length})`}
            value={formatStat(stats.ri, 2)}
            info="Випадковий індекс, тобто середня узгодженість випадкової матриці розміру n, відносно якої нормують індекс CI."
          />
          <Stat
            label="CR"
            value={formatStat(stats.cr)}
            info="Відношення узгодженості, що дорівнює CI поділеному на RI. Матриця вважається прийнятною, коли CR не перевищує 0,10."
            className={cn('font-semibold tabular-nums', getCrColor(stats.cr))}
          />
        </section>
      </TooltipProvider>

      <AhpMatrix
        criteria={criteria.data}
        matrix={matrix}
        onChange={setMatrix}
        highlightPairs={highlightPairs}
      />

      {stats.cr > CR_THRESHOLD && inconsistentPairs.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <p>
            CR перевищує 0,10. Найбільший внесок у неузгодженість дають пари:{' '}
            {inconsistentPairs.map(({ i, j }, idx) => (
              <span key={`${i}-${j}`}>
                {idx > 0 ? ', ' : ''}
                <span className="font-semibold">{criteria.data[i].name}</span> /{' '}
                <span className="font-semibold">{criteria.data[j].name}</span>
              </span>
            ))}
            . Перегляньте їх перед обчисленням.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabularExportButtons
          csvRows={csvRows}
          jsonData={jsonPayload}
          filenameBase="pairwise-matrix"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            aria-label="Скинути до дефолту"
            title="Скинути до дефолту"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleRunFahp}
            disabled={!canRunFahp || createEvaluation.isPending}
            title={canRunFahp ? undefined : 'Узгодженість CR перевищує 0,10'}
          >
            {createEvaluation.isPending ? 'Обчислення…' : 'Обчислити ваги'}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  // Short explanation surfaced via an info icon + tooltip next to the label.
  info: string
  className?: string
}

function Stat({ label, value, info, className }: StatProps) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Що таке ${label}`}
              className="inline-flex rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <InfoIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{info}</TooltipContent>
        </Tooltip>
      </p>
      <p className={cn('mt-0.5 text-base font-semibold tabular-nums', className)}>{value}</p>
    </div>
  )
}
