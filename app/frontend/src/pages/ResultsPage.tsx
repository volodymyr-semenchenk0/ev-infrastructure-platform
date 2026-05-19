import { useEffect, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useEvaluation } from '@/features/results/useEvaluation'
import { useLocations } from '@/features/locations/useLocations'
import { useCriteria } from '@/features/calculate/useCriteria'
import { useEvaluationsHistory } from '@/store/evaluations-history'
import { EvaluationsHistoryList } from '@/features/results/EvaluationsHistoryList'
import { ResultsHeader } from '@/features/results/ResultsHeader'
import { RankingTable, type RankingRow } from '@/features/results/RankingTable'
import { WeightsBarChart } from '@/features/results/WeightsBarChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { NotFoundError } from '@/lib/api'

export function ResultsPage() {
  const { id } = useParams<{ id?: string }>()
  const numericId = id ? Number.parseInt(id, 10) : NaN
  const isValidId = Number.isFinite(numericId) && numericId > 0

  if (!id) return <EvaluationsHistoryList />
  if (!isValidId) return <Navigate to="/results" replace />

  return <EvaluationDetail evaluationId={numericId} />
}

function EvaluationDetail({ evaluationId }: { evaluationId: number }) {
  const evaluation = useEvaluation(evaluationId)
  const locations = useLocations()
  const criteria = useCriteria()
  const historyItem = useEvaluationsHistory((s) =>
    s.recent.find((r) => r.id === evaluationId),
  )

  useEffect(() => {
    if (evaluation.error instanceof NotFoundError) {
      toast({
        title: 'Розрахунок не знайдено',
        description: `Evaluation #${evaluationId}`,
        variant: 'destructive',
      })
    }
  }, [evaluation.error, evaluationId])

  const rankingRows = useMemo<RankingRow[] | null>(() => {
    if (!evaluation.data || !locations.data) return null
    const locById = new Map(locations.data.map((l) => [l.id, l]))
    return evaluation.data.ranking.map((r) => {
      const loc = locById.get(r.locationId)
      return {
        locationId: r.locationId,
        rank: r.rank,
        closeness: r.closeness,
        sPlus: r.sPlus,
        sMinus: r.sMinus,
        name: loc?.name ?? `#${r.locationId}`,
        district: loc?.district,
      }
    })
  }, [evaluation.data, locations.data])

  const criteriaNames = useMemo<Record<string, string>>(() => {
    if (!criteria.data) return {}
    return Object.fromEntries(criteria.data.map((c) => [c.code, c.name]))
  }, [criteria.data])

  if (evaluation.error instanceof NotFoundError) {
    return <Navigate to="/results" replace />
  }

  if (evaluation.isLoading || !evaluation.data || !rankingRows) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ResultsHeader
        evaluationId={evaluation.data.evaluationId}
        profileName={historyItem?.profileName}
        executionTimeMs={evaluation.data.executionTimeMs}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ваги критеріїв</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightsBarChart
            weights={evaluation.data.weights}
            criteriaNames={criteriaNames}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ранжування локацій</CardTitle>
        </CardHeader>
        <CardContent>
          <RankingTable rows={rankingRows} />
        </CardContent>
      </Card>
    </div>
  )
}
