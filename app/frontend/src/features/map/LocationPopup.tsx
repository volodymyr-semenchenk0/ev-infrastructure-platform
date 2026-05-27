import { Popup } from 'react-map-gl/maplibre'
import { X } from 'lucide-react'
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
      closeButton={false}
      maxWidth="340px"
    >
      <div className="relative p-4 space-y-3 min-w-[280px]">
        {/* Custom close button — inset from corner */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Закрити"
        >
          <X size={14} />
        </button>

        {/* Name + district stacked */}
        <div className="pr-6 space-y-1">
          <h3 className="text-sm font-semibold leading-tight">{location.name}</h3>
          {location.district && (
            <Badge variant="outline" className="text-[10px]">
              {location.district}
            </Badge>
          )}
        </div>

        {location.address && (
          <p className="text-xs text-muted-foreground">{location.address}</p>
        )}

        {/* Rank chip + C* */}
        {rank != null && (
          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
              Ранг #{rank}
            </span>
            {closeness != null && (
              <span className="text-xs text-muted-foreground tabular-nums">
                C* = {closeness.toFixed(3)}
              </span>
            )}
          </div>
        )}

        {/* Criteria table — Ukrainian name + (unit) */}
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {Object.entries(values).map(([code, value]) => {
              const criterion = criteriaByCode.get(code)
              const label = criterion
                ? `${criterion.name} (${criterion.unit})`
                : code
              return (
                <tr key={code} className="border-b last:border-0">
                  <td className="py-1 pr-3 text-muted-foreground leading-snug">
                    {label}
                  </td>
                  <td className="py-1 text-right font-mono whitespace-nowrap">
                    {value.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Popup>
  )
}
