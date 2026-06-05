import { useMemo, useState } from 'react'
import { Loader2, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import { ChartCard } from '@/features/export/ChartCard'
import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { useLocations } from '@/features/locations/useLocations'
import { ConvergenceChart } from '@/features/sensitivity/ConvergenceChart'
import { CstarHistogram } from '@/features/sensitivity/CstarHistogram'
import { RankingForestPlot } from '@/features/sensitivity/RankingForestPlot'
import { useSensitivity, type SensitivityResponse } from '@/features/sensitivity/useSensitivity'
import {
  ITERATIONS_MAX,
  ITERATIONS_MIN,
  PERTURBATION_MAX,
  PERTURBATION_MIN,
  useSensitivityForm,
} from '@/features/sensitivity/useSensitivityForm'
import { ValidationError } from '@/lib/api'
import { useSessionStore } from '@/store/session-store'

// Monte Carlo seed is fixed in the backend (DEFAULT_SEED = 42). We surface it
// so the operator can verify reproducibility.
const DEFAULT_SEED = 42

const K_VALUES = [1, 3, 5] as const

export function SensitivitySection() {
  const evaluationId = useSessionStore((s) => s.evaluationId)
  const sensitivity = useSessionStore((s) => s.sensitivity)
  const setSensitivity = useSessionStore((s) => s.setSensitivity)
  const setError = useSessionStore((s) => s.setError)
  const locations = useLocations()

  const form = useSensitivityForm()
  const mutation = useSensitivity()

  // Stability table sort: by one of the p_i(k) columns, descending by default
  // (most stable first). p_i(1) is the default — the rank-1 acceptability index.
  const [sortK, setSortK] = useState<(typeof K_VALUES)[number]>(1)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (k: (typeof K_VALUES)[number]) => {
    if (k === sortK) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortK(k)
      setSortDir('desc')
    }
  }

  // Which location's C* histogram to show. The selector lives in the chart
  // card header; null means "fall back to the top-ranked location".
  const [histLocationId, setHistLocationId] = useState<number | null>(null)
  const histSelectedId =
    sensitivity?.rankingIntervals.find((r) => r.locationId === histLocationId)?.locationId ??
    sensitivity?.rankingIntervals[0]?.locationId ??
    0

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

  const sortedStability = useMemo(() => {
    if (!sensitivity) return []
    const key = String(sortK)
    return Object.entries(sensitivity.stabilityMatrix)
      .map(([idStr, perK]) => ({
        locationId: Number(idStr),
        perK: perK as Record<string, number>,
      }))
      .sort((a, b) => {
        const primary = (a.perK[key] ?? 0) - (b.perK[key] ?? 0)
        if (primary !== 0) return sortDir === 'asc' ? primary : -primary
        // Tie-break by the remaining columns, narrowest band first (1 → 3 → 5),
        // always descending so the more consistently stable location wins.
        for (const tk of K_VALUES) {
          if (tk === sortK) continue
          const d = (b.perK[String(tk)] ?? 0) - (a.perK[String(tk)] ?? 0)
          if (d !== 0) return d
        }
        return 0
      })
  }, [sensitivity, sortK, sortDir])

  const stabilityCsv = useMemo(() => {
    if (!sensitivity) return [] as ReadonlyArray<ReadonlyArray<string | number>>
    return [
      ['location_id', 'name', ...K_VALUES.map((k) => `p_${k}`)],
      ...sortedStability.map(({ locationId, perK }) => [
        locationId,
        nameByLocationId[locationId] ?? `#${locationId}`,
        ...K_VALUES.map((k) => perK[String(k)] ?? 0),
      ]),
    ]
  }, [sensitivity, sortedStability, nameByLocationId])

  if (evaluationId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Спочатку обчисліть ваги і ранжування у попередньому розділі.
      </p>
    )
  }

  const handleRun = async () => {
    try {
      const result = (await mutation.mutateAsync({
        evaluationId,
        body: form.requestBody,
      })) as SensitivityResponse
      setSensitivity(result, {
        iterations: form.iterations,
        perturbation: form.perturbation,
      })
      setError(null)
      toast({
        title: 'Аналіз чутливості виконано',
        description: `Ітерацій: ${form.iterations.toLocaleString('uk-UA')}, δ = ${form.perturbation.toFixed(2)}.`,
      })
    } catch (error) {
      const description =
        error instanceof ValidationError ? error.detail : 'Не вдалося виконати аналіз чутливості.'
      setError({ message: description, source: 'sensitivity' })
      toast({ title: 'Помилка чутливості', description, variant: 'destructive' })
    }
  }

  const filenameBase = `monte-carlo-${evaluationId ?? 'session'}`

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="sens-iterations" className="text-xs font-medium">
            Кількість ітерацій N
            <span className="ml-1 text-muted-foreground">
              ({ITERATIONS_MIN.toLocaleString('uk-UA')}–{ITERATIONS_MAX.toLocaleString('uk-UA')})
            </span>
          </Label>
          <Input
            id="sens-iterations"
            type="number"
            min={ITERATIONS_MIN}
            max={ITERATIONS_MAX}
            step={100}
            value={form.iterations}
            onChange={(e) => form.setIterations(Number(e.target.value))}
            disabled={mutation.isPending}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="sens-perturbation" className="text-xs font-medium">
            Амплітуда збурення δ ={' '}
            <span className="font-mono tabular-nums">{form.perturbation.toFixed(2)}</span>
            <span className="ml-1 text-muted-foreground">
              ({PERTURBATION_MIN.toFixed(2)}–{PERTURBATION_MAX.toFixed(2)})
            </span>
          </Label>
          <Slider
            id="sens-perturbation"
            min={PERTURBATION_MIN}
            max={PERTURBATION_MAX}
            step={0.01}
            value={[form.perturbation]}
            onValueChange={(values: number[]) => form.setPerturbation(values[0])}
            disabled={mutation.isPending}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Зерно генератора випадкових чисел: <span className="font-mono">{DEFAULT_SEED}</span>
          {' (фіксоване – результат відтворюваний)'}
        </p>
      </div>

      <Button size="sm" onClick={handleRun} disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Запуск МК…
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            Запустити
          </>
        )}
      </Button>

      {sensitivity && (
        <div className="space-y-6 border-t pt-4">
          <ChartCard
            title="Гістограма розподілу C*"
            filenameBase={`${filenameBase}-histogram`}
            controls={
              <div className="flex items-center gap-2">
                <label htmlFor="hist-loc" className="text-xs text-muted-foreground">
                  Локація:
                </label>
                <select
                  id="hist-loc"
                  value={histSelectedId}
                  onChange={(e) => setHistLocationId(Number(e.target.value))}
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                >
                  {sensitivity.rankingIntervals.map((r) => (
                    <option key={r.locationId} value={r.locationId}>
                      {nameByLocationId[r.locationId] ?? `#${r.locationId}`}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <CstarHistogram
              histogram={sensitivity.cstarHistogram}
              rankingIntervals={sensitivity.rankingIntervals}
              selectedLocationId={histSelectedId}
            />
          </ChartCard>

          <ChartCard
            title="Інтервали рангів за C*"
            filenameBase={`${filenameBase}-forest`}
          >
            <RankingForestPlot
              rankingIntervals={sensitivity.rankingIntervals}
              nameByLocationId={nameByLocationId}
            />
          </ChartCard>

          <ChartCard title="Збіжність середнього C*" filenameBase={`${filenameBase}-convergence`}>
            <ConvergenceChart
              convergence={sensitivity.convergence}
              rankingIntervals={sensitivity.rankingIntervals}
              nameByLocationId={nameByLocationId}
            />
          </ChartCard>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Матриця індексів прийнятності рангів</h3>
            <p className="mb-4 max-w-[600px] text-sm text-muted-foreground">
              Індекс прийнятності рангів p_i(k) – частка прогонів Монте-Карло, у яких локація
              потрапила до k найкращих за випадкових збурень ваг критеріїв. Значення, близьке до
              100 %, свідчить про стійко високу позицію, близьке до 0 % – про нестабільну. Стовпці:
              k = 1 – перше місце, k = 3 і k = 5 – входження до трьох і пʼяти найкращих.
            </p>
            <div className="overflow-hidden rounded-md border border-border">
              <Table className="min-w-[380px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Локація</TableHead>
                    {K_VALUES.map((k) => (
                      <TableHead key={k} className="text-right">
                        <button
                          type="button"
                          className="-mx-2 inline-flex items-center rounded px-2 py-1 hover:bg-accent"
                          onClick={() => toggleSort(k)}
                        >
                          p_i({k})
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStability.map(({ locationId, perK }) => {
                    const label = nameByLocationId[locationId] ?? `#${locationId}`
                    return (
                      <TableRow key={locationId}>
                        <TableCell>{label}</TableCell>
                        {K_VALUES.map((k) => (
                          <TableCell key={k} className="text-right font-mono tabular-nums">
                            {((perK[String(k)] ?? 0) * 100).toFixed(1)}%
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex justify-start">
              <TabularExportButtons
                csvRows={stabilityCsv}
                jsonData={{
                  evaluationId,
                  params: {
                    iterations: form.iterations,
                    perturbation: form.perturbation,
                  },
                  seed: DEFAULT_SEED,
                  stabilityMatrix: sensitivity.stabilityMatrix,
                  confidenceIntervals: sensitivity.confidenceIntervals,
                }}
                filenameBase={filenameBase}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
