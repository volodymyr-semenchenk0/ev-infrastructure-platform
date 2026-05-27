import { useMemo } from 'react'

import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { useLocations } from '@/features/locations/useLocations'
import { RankingTable, type RankingRow } from '@/features/results/RankingTable'
import { useSessionStore } from '@/store/session-store'

import { IntermediatesGapNote } from './FahpDetails'

// /details#topsis shows the full ranking table joined with location names,
// districts, and distance columns. The vector-normalised matrix, weighted
// matrix, and ideal-solution vectors require backend changes (see ADR-0001).
export function TopsisDetails() {
  const ranking = useSessionStore((s) => s.ranking)
  const evaluationId = useSessionStore((s) => s.evaluationId)
  const selectedLocationId = useSessionStore((s) => s.selectedLocationId)
  const setSelectedLocationId = useSessionStore((s) => s.setSelectedLocationId)
  const locations = useLocations()

  const rows = useMemo<RankingRow[]>(() => {
    if (!ranking || !locations.data) return []
    const byId = new Map(locations.data.map((l) => [l.id, l]))
    return ranking.map((item) => {
      const loc = byId.get(item.locationId)
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
        Ранжування ще не виконано. Виконайте розрахунок на панелі керування.
      </p>
    )
  }

  const filenameBase = `topsis-ranking-${evaluationId ?? 'session'}`

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <TabularExportButtons
          csvRows={csvRows}
          jsonData={{ evaluationId, ranking: rows }}
          filenameBase={filenameBase}
        />
      </div>
      <RankingTable
        rows={rows}
        selectedLocationId={selectedLocationId}
        onRowClick={(id) =>
          setSelectedLocationId(selectedLocationId === id ? null : id)
        }
      />
      <IntermediatesGapNote
        items={['r_ij', 'v_ij', 'A^+', 'A^-']}
        formulas="формули (1.10)-(1.13)"
      />
    </div>
  )
}
