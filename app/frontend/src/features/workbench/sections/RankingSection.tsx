import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { useLocations } from '@/features/locations/useLocations'
import { RankingTable, type RankingRow } from '@/features/results/RankingTable'
import { RankingMapEmbed } from '@/features/workbench/RankingMapEmbed'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

export function RankingSection() {
  const ranking = useSessionStore((s) => s.ranking)
  const evaluationId = useSessionStore((s) => s.evaluationId)
  const selectedLocationId = useSessionStore((s) => s.selectedLocationId)
  const setSelectedLocationId = useSessionStore((s) => s.setSelectedLocationId)
  const locations = useLocations()
  const setActiveStep = useUiStore((s) => s.setActiveStep)

  const rows = useMemo<RankingRow[]>(() => {
    if (!ranking || !locations.data) return []
    const locationById = new Map(locations.data.map((l) => [l.id, l]))
    return ranking.map((item) => {
      const loc = locationById.get(item.locationId)
      return {
        locationId: item.locationId,
        rank: item.rank,
        closeness: item.closeness,
        sPlus: item.sPlus,
        sMinus: item.sMinus,
        name: loc?.name ?? `#${item.locationId}`,
        district: loc?.district ?? null,
      }
    })
  }, [ranking, locations.data])

  const csvRows = useMemo(
    () => [
      ['rank', 'location_id', 'name', 'district', 'closeness', 's_plus', 's_minus'],
      ...rows.map((row) => [
        row.rank,
        row.locationId,
        row.name,
        row.district ?? '',
        row.closeness,
        row.sPlus,
        row.sMinus,
      ]),
    ],
    [rows]
  )

  if (!ranking) {
    return (
      <p className="text-sm text-muted-foreground">
        Ранжування ще не виконано. Натисніть «Обчислити ваги» в розділі матриці – TOPSIS виконується
        в межах того ж сеансу.
      </p>
    )
  }

  if (locations.isLoading) {
    return <Skeleton className="h-32 w-full" />
  }

  const filenameBase = `topsis-ranking-${evaluationId ?? 'session'}`

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Ранжування (TOPSIS)</h3>
      <p className="max-w-[600px] text-sm text-muted-foreground">
        Локації впорядковано за спаданням коефіцієнта близькості C*. Колір рядка (і піна на карті)
        кодує відносну позицію в ранжуванні – верхню, середню чи нижню групу, а не абсолютну якість.
        Позначка ≈ біля C* вказує на сусідні ранги з практично нерозрізнюваними значеннями. S+ –
        відстань локації до позитивно-ідеального розвʼязку, S- – до негативно-ідеального; що менше S+
        і більше S-, то вищий C*.
      </p>
      <RankingMapEmbed />
      <div className="overflow-hidden rounded-md border border-border">
        <RankingTable
          rows={rows}
          selectedLocationId={selectedLocationId}
          onRowClick={(id) => setSelectedLocationId(selectedLocationId === id ? null : id)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabularExportButtons
          csvRows={csvRows}
          jsonData={{ evaluationId, ranking: rows }}
          filenameBase={filenameBase}
        />
        <Button type="button" size="sm" onClick={() => setActiveStep('sensitivity')}>
          Перевірити чутливість
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
