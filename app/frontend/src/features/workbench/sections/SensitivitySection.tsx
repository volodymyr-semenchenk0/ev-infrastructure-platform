import { useMemo } from 'react'
import { Loader2, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { toast } from '@/components/ui/use-toast'
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

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

  const sortedStability = useMemo(() => {
    if (!sensitivity) return []
    return Object.entries(sensitivity.stabilityMatrix)
      .map(([idStr, perK]) => ({
        locationId: Number(idStr),
        perK: perK as Record<string, number>,
      }))
      .sort((a, b) => (b.perK['1'] ?? 0) - (a.perK['1'] ?? 0))
  }, [sensitivity])

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
          Зерно ГВЧ: <span className="font-mono">{DEFAULT_SEED}</span>
          {' (фіксоване, відтворюваний результат)'}
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
          <div className="flex justify-end">
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

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Крок 1 – розподіл C* для локації</h3>
            <CstarHistogram
              histogram={sensitivity.cstarHistogram}
              rankingIntervals={sensitivity.rankingIntervals}
              nameByLocationId={nameByLocationId}
              filenameBase={filenameBase}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Крок 2 – інтервали рангів за C*</h3>
            <RankingForestPlot
              rankingIntervals={sensitivity.rankingIntervals}
              nameByLocationId={nameByLocationId}
              filenameBase={filenameBase}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Крок 3 – збіжність середнього C*</h3>
            <ConvergenceChart
              convergence={sensitivity.convergence}
              rankingIntervals={sensitivity.rankingIntervals}
              nameByLocationId={nameByLocationId}
              filenameBase={filenameBase}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Матриця стабільності p_i(k) (таблиця)</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Локація</th>
                  {K_VALUES.map((k) => (
                    <th key={k} className="py-2 pr-3 text-right font-medium">
                      p_i({k})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStability.map(({ locationId, perK }) => {
                  const label = nameByLocationId[locationId] ?? `#${locationId}`
                  return (
                    <tr key={locationId} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">{label}</td>
                      {K_VALUES.map((k) => (
                        <td key={k} className="py-2 pr-3 text-right font-mono tabular-nums">
                          {((perK[String(k)] ?? 0) * 100).toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
