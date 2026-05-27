import { useEffect, useRef, useState } from 'react'
import { Map as MapGL, type MapRef } from 'react-map-gl/maplibre'

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
  // Optional two-way sync. When `selectedLocationId` changes the map flies
  // to that marker and shows its popup; marker clicks invoke
  // `onSelectLocation` instead of the previous internal-only highlight.
  selectedLocationId?: number | null
  onSelectLocation?: (locationId: number | null) => void
}

const FLY_TO_ZOOM = 13
const FLY_TO_DURATION_MS = 600

export function LocationMap({
  locations,
  criteria,
  rankByLocationId,
  selectedLocationId,
  onSelectLocation,
}: LocationMapProps) {
  // When `selectedLocationId` is undefined we keep the previous fully-internal
  // behaviour so callers that pass only locations/criteria do not regress.
  const isControlled = selectedLocationId !== undefined
  const [internalActiveId, setInternalActiveId] = useState<number | null>(null)
  const activeId = isControlled ? (selectedLocationId ?? null) : internalActiveId

  const total = locations.length
  const active = locations.find((l) => l.id === activeId) ?? null
  const activeRank = active ? rankByLocationId.get(active.id) ?? null : null

  const mapRef = useRef<MapRef | null>(null)

  useEffect(() => {
    if (!isControlled || !active || !mapRef.current) return
    mapRef.current.flyTo({
      center: [active.longitude, active.latitude],
      zoom: FLY_TO_ZOOM,
      duration: FLY_TO_DURATION_MS,
    })
  }, [active, isControlled])

  const handleSelect = (id: number | null) => {
    if (isControlled) {
      onSelectLocation?.(id)
    } else {
      setInternalActiveId(id)
    }
  }

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        initialViewState={KYIV_CENTER}
        mapStyle={OSM_STYLE}
        onClick={() => handleSelect(null)}
      >
        {locations.map((loc) => (
          <LocationMarker
            key={loc.id}
            location={loc}
            rank={rankByLocationId.get(loc.id)?.rank ?? null}
            total={total}
            onClick={() => handleSelect(loc.id)}
          />
        ))}
        {active && (
          <LocationPopup
            location={active}
            rank={activeRank?.rank ?? null}
            closeness={activeRank?.closeness ?? null}
            criteria={criteria}
            onClose={() => handleSelect(null)}
          />
        )}
      </MapGL>
      <MapLegend />
    </div>
  )
}
