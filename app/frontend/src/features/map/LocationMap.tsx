import { useState } from 'react'
import { Map as MapGL } from 'react-map-gl/maplibre'
import { LocationMarker } from './LocationMarker'
import { LocationPopup } from './LocationPopup'
import { MapLegend } from './MapLegend'
import { KYIV_CENTER, OSM_STYLE } from './map-style'
import type { LocationItem } from '@/features/locations/useLocations'
import type { Criterion } from '@/features/calculate/useCriteria'

export interface RankInfo {
  rank: number
  closeness: number
}

interface LocationMapProps {
  locations: LocationItem[]
  criteria: Criterion[]
  rankByLocationId: Map<number, RankInfo>
}

export function LocationMap({ locations, criteria, rankByLocationId }: LocationMapProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const total = locations.length
  const active = locations.find((l) => l.id === activeId) ?? null
  const activeRank = active ? rankByLocationId.get(active.id) ?? null : null

  return (
    <div className="relative h-full w-full">
      <MapGL
        initialViewState={KYIV_CENTER}
        mapStyle={OSM_STYLE}
        onClick={() => setActiveId(null)}
      >
        {locations.map((loc) => (
          <LocationMarker
            key={loc.id}
            location={loc}
            rank={rankByLocationId.get(loc.id)?.rank ?? null}
            total={total}
            onClick={() => setActiveId(loc.id)}
          />
        ))}
        {active && (
          <LocationPopup
            location={active}
            rank={activeRank?.rank ?? null}
            closeness={activeRank?.closeness ?? null}
            criteria={criteria}
            onClose={() => setActiveId(null)}
          />
        )}
      </MapGL>
      <MapLegend />
    </div>
  )
}
