import { useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LocationMap, type RankInfo } from '@/features/map/LocationMap'
import { EvaluationSelector } from '@/features/map/EvaluationSelector'
import { useLocations } from '@/features/locations/useLocations'
import { useCriteria } from '@/features/calculate/useCriteria'
import { useEvaluation } from '@/features/results/useEvaluation'
import { useEvaluationsHistory } from '@/store/evaluations-history'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, Info } from 'lucide-react'

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const evaluationIdParam = searchParams.get('evaluationId')
  const evaluationId = evaluationIdParam ? Number.parseInt(evaluationIdParam, 10) : NaN
  const validId = Number.isFinite(evaluationId) && evaluationId > 0

  const locations = useLocations()
  const criteria = useCriteria()
  const evaluation = useEvaluation(validId ? evaluationId : NaN)
  const history = useEvaluationsHistory((s) => s.recent)

  // Auto-select most recent from history when no URL param is set.
  useEffect(() => {
    if (!evaluationIdParam && history.length > 0) {
      setSearchParams({ evaluationId: String(history[0].id) }, { replace: true })
    }
  }, [evaluationIdParam, history, setSearchParams])

  const rankByLocationId = useMemo<Map<number, RankInfo>>(() => {
    const map = new Map<number, RankInfo>()
    if (evaluation.data) {
      for (const item of evaluation.data.ranking) {
        map.set(item.locationId, { rank: item.rank, closeness: item.closeness })
      }
    }
    return map
  }, [evaluation.data])

  const isLoading = locations.isLoading || criteria.isLoading
  const hasNoHistory = history.length === 0

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Карта Києва</h1>
          <p className="text-xs text-muted-foreground">
            {locations.data?.length ?? 0} локацій-кандидатів
            {validId && evaluation.data && (
              <> · розрахунок #{evaluation.data.evaluationId}</>
            )}
          </p>
        </div>
        <EvaluationSelector
          value={validId ? evaluationId : null}
          onChange={(id) =>
            id == null
              ? setSearchParams({})
              : setSearchParams({ evaluationId: String(id) })
          }
        />
      </div>

      {hasNoHistory && (
        <Card className="mx-6 mt-3 border-dashed">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Виконайте розрахунок, щоб маркери отримали кольорове кодування за рангом.
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/profile">
                Новий розрахунок
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative flex-1 overflow-hidden">
        {isLoading || !locations.data || !criteria.data ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : (
          <LocationMap
            locations={locations.data}
            criteria={criteria.data}
            rankByLocationId={rankByLocationId}
          />
        )}
      </div>
    </div>
  )
}
