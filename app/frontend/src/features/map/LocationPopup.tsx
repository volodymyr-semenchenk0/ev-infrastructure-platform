import { Popup } from 'react-map-gl/maplibre'
import { Badge } from '@/components/ui/badge'
import type { LocationItem } from '@/features/locations/useLocations'
import type { Criterion } from '@/features/calculate/useCriteria'

interface LocationPopupProps {
  location: LocationItem
  rank: number | null
  closeness: number | null
  criteria: Criterion[]
  onClose: () => void
}

export function LocationPopup({
  location,
  rank,
  closeness,
  criteria,
  onClose,
}: LocationPopupProps) {
  const criteriaByCode = new Map(criteria.map((c) => [c.code, c]))
  const values = location.criteriaValues ?? {}

  return (
    <Popup
      longitude={location.longitude}
      latitude={location.latitude}
      anchor="top"
      onClose={onClose}
      closeOnClick={false}
      maxWidth="320px"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{location.name}</h3>
          {location.district && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {location.district}
            </Badge>
          )}
        </div>
        {location.address && (
          <p className="text-xs text-muted-foreground">{location.address}</p>
        )}
        {rank != null && (
          <p className="text-xs">
            <span className="font-semibold">Ранг #{rank}</span>
            {closeness != null && <span> · C* = {closeness.toFixed(3)}</span>}
          </p>
        )}
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {Object.entries(values).map(([code, value]) => {
              const name = criteriaByCode.get(code)?.name ?? code
              return (
                <tr key={code} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-mono text-muted-foreground" title={name}>
                    {code}
                  </td>
                  <td className="py-1 text-right font-mono">{value.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Popup>
  )
}
