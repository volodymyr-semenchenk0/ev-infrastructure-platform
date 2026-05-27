import { Marker } from 'react-map-gl/maplibre'
import { MapPin } from 'lucide-react'

import { colorByRank, colorByStability } from './marker-color'
import type { LocationItem } from '@/features/locations/useLocations'

interface LocationMarkerProps {
  location: LocationItem
  rank: number | null
  total: number
  onClick: () => void
  // Optional stability shading. When `stabilityProbability` is provided and
  // `colorMode` is 'stability', the marker is shaded by p_i(1) intensity per
  // UI_PLAN §5.2.5. Otherwise the marker keeps its rank-based colour.
  stabilityProbability?: number | null
  colorMode?: 'rank' | 'stability'
}

export function LocationMarker({
  location,
  rank,
  total,
  onClick,
  stabilityProbability,
  colorMode = 'rank',
}: LocationMarkerProps) {
  const color =
    colorMode === 'stability'
      ? colorByStability(stabilityProbability ?? null)
      : colorByRank(rank, total)
  const ariaSuffix =
    colorMode === 'stability' && stabilityProbability !== undefined && stabilityProbability !== null
      ? `, стійкість ${(stabilityProbability * 100).toFixed(0)}%`
      : rank
        ? `, ранг ${rank}`
        : ''
  return (
    <Marker
      longitude={location.longitude}
      latitude={location.latitude}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick()
      }}
    >
      <button
        type="button"
        aria-label={`${location.name}${ariaSuffix}`}
        className="block transition-transform hover:scale-110"
      >
        <MapPin
          className="h-8 w-8 drop-shadow-md"
          style={{ color, fill: color, stroke: '#fff', strokeWidth: 1 }}
        />
      </button>
    </Marker>
  )
}
