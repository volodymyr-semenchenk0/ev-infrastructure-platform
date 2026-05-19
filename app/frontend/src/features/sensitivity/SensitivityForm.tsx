import { Activity, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

import {
  ITERATIONS_DEFAULT,
  ITERATIONS_MAX,
  ITERATIONS_MIN,
  PERTURBATION_MAX,
  PERTURBATION_MIN,
} from './useSensitivityForm'

interface SensitivityFormProps {
  iterations: number
  perturbation: number
  isPending: boolean
  onIterationsChange: (v: number) => void
  onPerturbationChange: (v: number) => void
  onSubmit: () => void
}

export function SensitivityForm({
  iterations,
  perturbation,
  isPending,
  onIterationsChange,
  onPerturbationChange,
  onSubmit,
}: SensitivityFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Параметри Monte-Carlo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="iterations">
              Кількість ітерацій
              <span className="ml-2 text-xs text-muted-foreground">
                ({ITERATIONS_MIN.toLocaleString('uk-UA')} – {ITERATIONS_MAX.toLocaleString('uk-UA')})
              </span>
            </Label>
            <Input
              id="iterations"
              type="number"
              min={ITERATIONS_MIN}
              max={ITERATIONS_MAX}
              step={100}
              value={iterations}
              onChange={(e) => onIterationsChange(Number(e.target.value))}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              За замовчуванням {ITERATIONS_DEFAULT.toLocaleString('uk-UA')}; типовий run ≈ 3-5 секунд.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="perturbation">Амплітуда збурення δ</Label>
              <span className="text-sm font-medium tabular-nums">
                δ = {perturbation.toFixed(2)}
              </span>
            </div>
            <Slider
              id="perturbation"
              min={PERTURBATION_MIN}
              max={PERTURBATION_MAX}
              step={0.01}
              value={[perturbation]}
              onValueChange={(values) => onPerturbationChange(values[0] ?? 0.15)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Ваги збурюються рівномірно у діапазоні [−δ, +δ] перед нормалізацією (формула 1.15–1.16).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {isPending && (
            <span className="text-sm text-muted-foreground">
              Виконуємо {iterations.toLocaleString('uk-UA')} ітерацій…
            </span>
          )}
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Activity className="mr-2 h-4 w-4" />
            )}
            Запустити аналіз
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
