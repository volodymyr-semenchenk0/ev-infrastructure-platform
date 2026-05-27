import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Loader2, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { toast } from '@/components/ui/use-toast'
import { useLocations } from '@/features/locations/useLocations'
import {
  useSensitivity,
  type SensitivityResponse,
} from '@/features/sensitivity/useSensitivity'
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
// so the operator can verify reproducibility per UI_PLAN §6.
const DEFAULT_SEED = 42

export function SensitivitySection() {
  const evaluationId = useSessionStore((s) => s.evaluationId)
  const sensitivity = useSessionStore((s) => s.sensitivity)
  const setSensitivity = useSessionStore((s) => s.setSensitivity)
  const setError = useSessionStore((s) => s.setError)
  const stabilityLayerEnabled = useSessionStore((s) => s.stabilityLayerEnabled)
  const setStabilityLayerEnabled = useSessionStore((s) => s.setStabilityLayerEnabled)
  const locations = useLocations()

  const form = useSensitivityForm()
  const mutation = useSensitivity()

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

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
        description: `Семплів: ${form.iterations.toLocaleString('uk-UA')}, δ = ${form.perturbation.toFixed(2)}.`,
      })
    } catch (error) {
      const description =
        error instanceof ValidationError
          ? error.detail
          : 'Не вдалося виконати аналіз чутливості.'
      setError({ message: description, source: 'sensitivity' })
      toast({ title: 'Помилка чутливості', description, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="sens-iterations" className="text-xs font-medium">
            Кількість ітерацій N
            <span className="ml-1 text-muted-foreground">
              ({ITERATIONS_MIN.toLocaleString('uk-UA')}–
              {ITERATIONS_MAX.toLocaleString('uk-UA')})
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
            <span className="font-mono tabular-nums">
              {form.perturbation.toFixed(2)}
            </span>
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

      <Button
        size="sm"
        onClick={handleRun}
        disabled={mutation.isPending}
        className="w-full"
      >
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
        <div className="space-y-3 border-t pt-3">
          <ConfidenceSummary
            confidenceIntervals={sensitivity.confidenceIntervals}
            nameByLocationId={nameByLocationId}
          />
          <StabilitySummary
            stabilityMatrix={sensitivity.stabilityMatrix}
            nameByLocationId={nameByLocationId}
          />

          <label className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm">
            <span>
              <span className="font-medium">Шар стійкості на карті</span>
              <span className="ml-1 text-muted-foreground">— забарвлення за p_i(1)</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-checked={stabilityLayerEnabled}
              checked={stabilityLayerEnabled}
              onChange={(e) => setStabilityLayerEnabled(e.target.checked)}
              className="h-4 w-7 cursor-pointer appearance-none rounded-full bg-muted transition-colors checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/details#mc">
              <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Деталі чутливості
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

interface SensitivitySharedProps {
  nameByLocationId: Record<number, string>
}

interface ConfidenceSummaryProps extends SensitivitySharedProps {
  confidenceIntervals: SensitivityResponse['confidenceIntervals']
}

function ConfidenceSummary({
  confidenceIntervals,
  nameByLocationId,
}: ConfidenceSummaryProps) {
  if (confidenceIntervals.length === 0) {
    return null
  }
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        95 % ДІ для топ-{confidenceIntervals.length}
      </p>
      <ul className="mt-1 space-y-1 text-sm">
        {confidenceIntervals.map((ci, idx) => {
          const label = nameByLocationId[ci.locationId] ?? `#${ci.locationId}`
          const mean = (ci.lower + ci.upper) / 2
          return (
            <li key={ci.locationId} className="flex justify-between gap-2">
              <span>
                {idx + 1}. {label}
              </span>
              <span className="font-mono text-xs tabular-nums">
                {mean.toFixed(3)} ± {(ci.upper - mean).toFixed(3)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface StabilitySummaryProps extends SensitivitySharedProps {
  stabilityMatrix: SensitivityResponse['stabilityMatrix']
}

const K_VALUES = [1, 3, 5] as const

function StabilitySummary({
  stabilityMatrix,
  nameByLocationId,
}: StabilitySummaryProps) {
  const entries = Object.entries(stabilityMatrix)
  if (entries.length === 0) return null

  // Sort by p_i(1) descending so the most stable location surfaces first.
  const sorted = entries
    .map(([idStr, perK]) => ({
      locationId: Number(idStr),
      perK: perK as Record<string, number>,
    }))
    .sort((a, b) => (b.perK['1'] ?? 0) - (a.perK['1'] ?? 0))

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        p_i(k) для k ∈ {'{'}1, 3, 5{'}'}
      </p>
      <table className="mt-1 w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-1 text-left font-medium">Локація</th>
            {K_VALUES.map((k) => (
              <th key={k} className="py-1 text-right font-medium">
                k={k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ locationId, perK }) => {
            const label = nameByLocationId[locationId] ?? `#${locationId}`
            return (
              <tr key={locationId} className="border-b last:border-b-0">
                <td className="py-1 pr-2 truncate">{label}</td>
                {K_VALUES.map((k) => (
                  <td key={k} className="py-1 text-right font-mono tabular-nums">
                    {((perK[String(k)] ?? 0) * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
