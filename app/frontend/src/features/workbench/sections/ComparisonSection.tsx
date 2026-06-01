import { useEffect, useMemo } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DiffTable } from '@/features/comparison/DiffTable'
import { GroupedBarChart } from '@/features/comparison/GroupedBarChart'
import { SpearmanBadge } from '@/features/comparison/SpearmanBadge'
import { useProfileComparison } from '@/features/comparison/useProfileComparison'
import { useLocations } from '@/features/locations/useLocations'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

// Canonical higher-order scenario (spec 2.1.1, 2.3.4): each standard profile is
// evaluated from its own default pairwise matrix, so the comparison is
// reproducible regardless of the current session. It runs automatically when the
// operator opens the step and caches the result; "Оновити" recomputes it.
export function ComparisonSection() {
  const activeStep = useUiStore((s) => s.activeStep)
  const setError = useSessionStore((s) => s.setError)
  const locations = useLocations()
  const { data, isFetched, isFetching, isError, refetch } = useProfileComparison()

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

  // Run once when the step is opened. The canonical result is cached, so
  // navigating back does not recompute it (each run persists two evaluations).
  useEffect(() => {
    if (activeStep === 'comparison' && !isFetched && !isFetching) {
      void refetch()
    }
  }, [activeStep, isFetched, isFetching, refetch])

  useEffect(() => {
    if (isError) {
      setError({ message: 'Не вдалося порівняти профілі.', source: 'comparison' })
    }
  }, [isError, setError])

  const rankings = useMemo(
    () =>
      data?.comparison.pairwiseDifferences.map((d) => ({
        locationId: d.locationId,
        rankA: d.rankA,
        rankB: d.rankB,
      })) ?? [],
    [data],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-[760px] text-sm text-muted-foreground">
          Канонічне порівняння двох стандартних профілів ОПР. Кожен профіль оцінюється з власної
          типової матриці попарних порівнянь, незалежно від правок у поточному сеансі, тож
          результат відтворюваний. Ранжування зіставляються за коефіцієнтом рангової кореляції
          Спірмена.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw
            className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')}
            aria-hidden="true"
          />
          Оновити
        </Button>
      </div>

      {isFetching && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Порівняння профілів…
        </div>
      )}

      {isError && !isFetching && (
        <p className="text-sm text-destructive">
          Не вдалося порівняти профілі. Натисніть «Оновити», щоб повторити.
        </p>
      )}

      {data && (
        <div className="space-y-6 border-t pt-4">
          <div className="flex flex-wrap items-start gap-4">
            <SpearmanBadge rho={data.comparison.spearmanRho} />
            <div className="grid gap-1 text-sm">
              <div>
                <span className="font-medium">Профіль A:</span> {data.profileA.name}
              </div>
              <div>
                <span className="font-medium">Профіль B:</span> {data.profileB.name}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Ранги локацій за профілями</h3>
            <GroupedBarChart rankings={rankings} nameByLocationId={nameByLocationId} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Різниці рангів</h3>
            <DiffTable
              differences={data.comparison.pairwiseDifferences}
              nameByLocationId={nameByLocationId}
            />
          </div>
        </div>
      )}
    </div>
  )
}
