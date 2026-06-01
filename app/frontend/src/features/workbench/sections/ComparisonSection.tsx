import { useEffect, useMemo } from 'react'
import { HelpCircle, Loader2 } from 'lucide-react'

import { DiffTable } from '@/features/comparison/DiffTable'
import { GroupedBarChart } from '@/features/comparison/GroupedBarChart'
import { SpearmanBadge } from '@/features/comparison/SpearmanBadge'
import { useProfileComparison } from '@/features/comparison/useProfileComparison'
import { ChartCard } from '@/features/export/ChartCard'
import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { useLocations } from '@/features/locations/useLocations'
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

  const csvRows = useMemo<ReadonlyArray<ReadonlyArray<string | number>>>(() => {
    if (!data) return []
    return [
      ['location_id', 'name', 'rank_a', 'rank_b', 'delta'],
      ...data.comparison.pairwiseDifferences.map((d) => [
        d.locationId,
        nameByLocationId[d.locationId] ?? `#${d.locationId}`,
        d.rankA,
        d.rankB,
        d.delta,
      ]),
    ]
  }, [data, nameByLocationId])

  const filenameBase = 'profile-comparison'

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Порівняння профілів ОПР</h3>
        <p className="max-w-[600px] text-sm text-muted-foreground">
          Канонічне порівняння двох стандартних профілів ОПР. Кожен профіль оцінюється з власної
          типової матриці попарних порівнянь, незалежно від правок у поточному сеансі, тож результат
          відтворюваний. Ранжування зіставляються за коефіцієнтом рангової кореляції Спірмена.
        </p>
      </div>

      {isFetching && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Порівняння профілів…
        </div>
      )}

      {isError && !isFetching && (
        <p className="text-sm text-destructive">Не вдалося порівняти профілі.</p>
      )}

      {data && (
        <div className="space-y-6 border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <SpearmanBadge rho={data.comparison.spearmanRho} />
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                Профілі
              </h4>
              <div className="grid gap-1 text-sm">
                <div>
                  <span className="font-medium">Профіль A:</span> {data.profileA.name}
                </div>
                <div>
                  <span className="font-medium">Профіль B:</span> {data.profileB.name}
                </div>
              </div>
            </div>
          </div>

          <ChartCard
            title="Ранги локацій за профілями"
            filenameBase={`${filenameBase}-ranks`}
          >
            <GroupedBarChart rankings={rankings} nameByLocationId={nameByLocationId} />
          </ChartCard>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Зіставлення рангів за профілями</h3>
            <p className="mb-4 max-w-[600px] text-sm text-muted-foreground">
              Таблиця подає ранг кожної локації-кандидата у двох профілях ОПР і їх різницю Δ = Ранг
              A − Ранг B. Відʼємне Δ (зелений) означає, що локацію вище оцінює профіль A –
              муніципалітет, додатне (червоний) – профіль B – інвестор, нуль – позиції в обох
              профілях збігаються.
            </p>
            <div className="overflow-hidden rounded-md border border-border">
              <DiffTable
                differences={data.comparison.pairwiseDifferences}
                nameByLocationId={nameByLocationId}
              />
            </div>
            <div className="mt-3 flex justify-start">
              <TabularExportButtons
                csvRows={csvRows}
                jsonData={{
                  profileA: {
                    id: data.profileA.id,
                    code: data.profileA.code,
                    name: data.profileA.name,
                  },
                  profileB: {
                    id: data.profileB.id,
                    code: data.profileB.code,
                    name: data.profileB.name,
                  },
                  spearmanRho: data.comparison.spearmanRho,
                  pairwiseDifferences: data.comparison.pairwiseDifferences,
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
