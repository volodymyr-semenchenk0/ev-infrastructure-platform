import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ExportButtons } from '@/features/export/ExportButtons'
import { useLocations } from '@/features/locations/useLocations'
import { RankingTable, type RankingRow } from '@/features/results/RankingTable'
import { useSessionStore } from '@/store/session-store'

export function RankingSection() {
  const ranking = useSessionStore((s) => s.ranking)
  const evaluationId = useSessionStore((s) => s.evaluationId)
  const selectedLocationId = useSessionStore((s) => s.selectedLocationId)
  const setSelectedLocationId = useSessionStore((s) => s.setSelectedLocationId)
  const locations = useLocations()

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

  return (
    <div className="space-y-3">
      <RankingTable
        rows={rows}
        selectedLocationId={selectedLocationId}
        onRowClick={(id) =>
          setSelectedLocationId(selectedLocationId === id ? null : id)
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {evaluationId !== null && (
          <ExportButtons evaluationId={evaluationId} size="sm" variant="outline" />
        )}
        <Button asChild variant="ghost" size="sm">
          <Link to="/details#topsis">
            <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Деталі обчислень
          </Link>
        </Button>
      </div>
    </div>
  )
}
