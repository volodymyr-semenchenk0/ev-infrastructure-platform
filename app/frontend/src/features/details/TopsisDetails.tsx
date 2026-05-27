import { useMemo } from 'react'

import { useLocations } from '@/features/locations/useLocations'
import { RankingTable, type RankingRow } from '@/features/results/RankingTable'
import { useSessionStore } from '@/store/session-store'

import { IntermediatesGapNote } from './FahpDetails'

// /details#topsis shows the full ranking table joined with location names,
// districts, and distance columns. The vector-normalised matrix, weighted
// matrix, and ideal-solution vectors require backend changes (see ADR-0001).
export function TopsisDetails() {
  const ranking = useSessionStore((s) => s.ranking)
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

  if (!ranking) {
    return (
      <p className="text-sm text-muted-foreground">
        Ранжування ще не виконано. Виконайте розрахунок на панелі керування.
      </p>
    )
  }

  return (
    <div className="space-y-4">
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
