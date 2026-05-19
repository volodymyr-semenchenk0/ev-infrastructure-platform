import { Marker } from 'react-map-gl/maplibre'
import { MapPin } from 'lucide-react'
import { colorByRank } from './marker-color'
import type { LocationItem } from '@/features/locations/useLocations'

interface LocationMarkerProps {
  location: LocationItem
  rank: number | null
  total: number
  onClick: () => void
}

export function LocationMarker({
  location,
  rank,
  total,
  onClick,
}: LocationMarkerProps) {
  const color = colorByRank(rank, total)
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
        aria-label={`${location.name}${rank ? `, ранг ${rank}` : ''}`}
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
