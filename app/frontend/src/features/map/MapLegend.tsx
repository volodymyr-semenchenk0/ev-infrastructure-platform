import { MARKER_COLORS } from './marker-color'

const items = [
  { color: MARKER_COLORS.top, label: 'Топ-3 (1–3)' },
  { color: MARKER_COLORS.mid, label: 'Середина (4–9)' },
  { color: MARKER_COLORS.bottom, label: 'Аутсайдери (10–12)' },
  { color: MARKER_COLORS.neutral, label: 'Без ранжування' },
] as const

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-md border bg-background/95 p-3 shadow-md backdrop-blur">
      <p className="mb-2 text-xs font-semibold">Кольоровий код</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-full border border-white shadow"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
