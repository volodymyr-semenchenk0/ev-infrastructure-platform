import { useMemo } from 'react'
import { EyeOff, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { useLocations } from '@/features/locations/useLocations'
import { ClosenessScatterPlot } from '@/features/results/ClosenessScatterPlot'
import { IntermediatesGapNote } from '@/features/results/IntermediatesGapNote'
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
  const mapVisible = useUiStore((s) => s.mapVisible)
  const setMapVisible = useUiStore((s) => s.setMapVisible)

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
    [rows],
  )

  if (!ranking) {
    return (
      <p className="text-sm text-muted-foreground">
        Ранжування ще не виконано. Натисніть «Обчислити ваги» в розділі матриці –
        TOPSIS виконується в межах того ж сеансу.
      </p>
    )
  }

  if (locations.isLoading) {
    return <Skeleton className="h-32 w-full" />
  }

  const filenameBase = `topsis-ranking-${evaluationId ?? 'session'}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant={mapVisible ? 'outline' : 'default'}
          size="sm"
          onClick={() => setMapVisible(!mapVisible)}
        >
          {mapVisible ? (
            <>
              <EyeOff className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Приховати карту
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Показати на карті
            </>
          )}
        </Button>
        <TabularExportButtons
          csvRows={csvRows}
          jsonData={{ evaluationId, ranking: rows }}
          filenameBase={filenameBase}
        />
      </div>
      {mapVisible && <RankingMapEmbed />}
      <RankingTable
        rows={rows}
        selectedLocationId={selectedLocationId}
        onRowClick={(id) =>
          setSelectedLocationId(selectedLocationId === id ? null : id)
        }
      />
      <ClosenessScatterPlot rows={rows} />
      <IntermediatesGapNote
        items={['r_ij', 'v_ij', 'A^+', 'A^-']}
        formulas="формули (1.10)-(1.13)"
      />
    </div>
  )
}
