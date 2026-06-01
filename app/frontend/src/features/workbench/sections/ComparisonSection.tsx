import { useEffect, useMemo } from 'react'
import { Loader2, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DiffTable } from '@/features/comparison/DiffTable'
import { GroupedBarChart } from '@/features/comparison/GroupedBarChart'
import { SpearmanBadge } from '@/features/comparison/SpearmanBadge'
import { useProfileComparison } from '@/features/comparison/useProfileComparison'
import { useLocations } from '@/features/locations/useLocations'
import { useSessionStore } from '@/store/session-store'

// Canonical higher-order scenario (spec 2.1.1, 2.3.4): each standard profile is
// evaluated from its own default pairwise matrix, so the comparison is
// reproducible regardless of the current session. The query is button-driven.
export function ComparisonSection() {
  const setError = useSessionStore((s) => s.setError)
  const locations = useLocations()
  const query = useProfileComparison()

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

  useEffect(() => {
    if (query.isError) {
      setError({ message: 'Не вдалося порівняти профілі.', source: 'comparison' })
    }
  }, [query.isError, setError])

  const data = query.data
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
      <p className="text-sm text-muted-foreground">
        Канонічне порівняння двох стандартних профілів ОПР. Кожен профіль оцінюється з власної
        типової матриці попарних порівнянь, незалежно від правок у поточному сеансі, тож
        результат відтворюваний. Ранжування зіставляються за коефіцієнтом рангової кореляції
        Спірмена.
      </p>

      <Button
        size="sm"
        onClick={() => query.refetch()}
        disabled={query.isFetching}
        className="w-full"
      >
        {query.isFetching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Порівняння…
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            Порівняти профілі
          </>
        )}
      </Button>

      {query.isError && (
        <p className="text-sm text-destructive">
          Не вдалося порівняти профілі. Спробуйте ще раз.
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
