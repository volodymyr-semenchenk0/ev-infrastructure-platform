import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { NotFoundError, ValidationError } from '@/lib/api'
import { useLocations } from '@/features/locations/useLocations'
import { useEvaluation } from '@/features/results/useEvaluation'
import { useEvaluationsHistory } from '@/store/evaluations-history'
import { EvaluationsHistoryList } from '@/features/results/EvaluationsHistoryList'

import { ConfidenceIntervalsChart } from '@/features/sensitivity/ConfidenceIntervalsChart'
import { SensitivityForm } from '@/features/sensitivity/SensitivityForm'
import { StabilityHeatmap } from '@/features/sensitivity/StabilityHeatmap'
import {
  useSensitivity,
  type SensitivityResponse,
} from '@/features/sensitivity/useSensitivity'
import { useSensitivityForm } from '@/features/sensitivity/useSensitivityForm'

export function SensitivityPage() {
  const { id } = useParams<{ id?: string }>()
  const numericId = id ? Number.parseInt(id, 10) : NaN
  const isValidId = Number.isFinite(numericId) && numericId > 0

  if (!id) return <EvaluationsHistoryList />
  if (!isValidId) return <Navigate to="/sensitivity" replace />

  return <SensitivityDetail evaluationId={numericId} />
}

function SensitivityDetail({ evaluationId }: { evaluationId: number }) {
  const evaluation = useEvaluation(evaluationId)
  const locations = useLocations()
  const historyItem = useEvaluationsHistory((s) =>
    s.recent.find((r) => r.id === evaluationId),
  )

  const form = useSensitivityForm()
  const sensitivity = useSensitivity()
  const [result, setResult] = useState<SensitivityResponse | null>(null)

  useEffect(() => {
    setResult(null)
  }, [evaluationId])

  useEffect(() => {
    if (evaluation.error instanceof NotFoundError) {
      toast({
        title: 'Розрахунок не знайдено',
        description: `Evaluation #${evaluationId}`,
        variant: 'destructive',
      })
    }
  }, [evaluation.error, evaluationId])

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

  const fullNameByCode = useMemo<Record<string, string>>(() => {
    if (!locations.data) return {}
    // stabilityMatrix is keyed by location.name from backend — same as `name`.
    return Object.fromEntries(
      locations.data.map((l) => [l.name, l.address ?? l.name]),
    )
  }, [locations.data])

  if (evaluation.error instanceof NotFoundError) {
    return <Navigate to="/sensitivity" replace />
  }

  if (evaluation.isLoading || !evaluation.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const handleSubmit = () => {
    sensitivity.mutate(
      { evaluationId, body: form.requestBody },
      {
        onSuccess: (data) => {
          setResult(data)
        },
        onError: (error) => {
          const description =
            error instanceof ValidationError
              ? error.detail
              : (error as Error).message || 'Не вдалося виконати аналіз чутливості'
          toast({ title: 'Помилка', description, variant: 'destructive' })
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Аналіз чутливості #{evaluationId}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {historyItem?.profileName
              ? `Профіль: ${historyItem.profileName} · `
              : ''}
            Monte-Carlo з фіксованим seed=42 (відтворюваний результат)
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/results/${evaluationId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            До ранжування
          </Link>
        </Button>
      </div>

      <SensitivityForm
        iterations={form.iterations}
        perturbation={form.perturbation}
        isPending={sensitivity.isPending}
        onIterationsChange={form.setIterations}
        onPerturbationChange={form.setPerturbation}
        onSubmit={handleSubmit}
      />

      {sensitivity.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-[480px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      )}

      {result && !sensitivity.isPending && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Матриця стабільності рангів</CardTitle>
            </CardHeader>
            <CardContent>
              <StabilityHeatmap
                stabilityMatrix={result.stabilityMatrix}
                fullNameByCode={fullNameByCode}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Рядок — локація, колонка R<i>k</i> — позиція в ранжуванні. Колір
                кодує P(rank=k | location). Сума по рядку = 1 (формула 1.17).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>95% довірчі інтервали C*</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfidenceIntervalsChart
                confidenceIntervals={result.confidenceIntervals}
                nameByLocationId={nameByLocationId}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Усі {result.confidenceIntervals.length} локацій, відсортовано за
                середнім C* спаданням. Семплів: {form.iterations.toLocaleString('uk-UA')},
                δ = {form.perturbation.toFixed(2)}.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
