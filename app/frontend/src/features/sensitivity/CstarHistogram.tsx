import { useRef, useState } from 'react'
import { ResponsiveBar, type BarCustomLayer } from '@nivo/bar'

import { ChartExportButtons } from '@/features/export/ChartExportButtons'
import { getNivoTheme } from '@/lib/nivo-theme'

import type { ConfidenceInterval, SensitivityResponse } from './useSensitivity'

interface CstarHistogramProps {
  histogram: SensitivityResponse['cstarHistogram']
  // Mean and 2.5/97.5 percentile band per location, used for the reference
  // lines and as the location list. rankingIntervals[0] is the top-1 location.
  rankingIntervals: ConfidenceInterval[]
  nameByLocationId?: Record<number, string>
  filenameBase: string
}

interface BinDatum {
  bin: string
  count: number
  [key: string]: string | number
}

export function CstarHistogram({
  histogram,
  rankingIntervals,
  nameByLocationId,
  filenameBase,
}: CstarHistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Default to the top-1 location (rankingIntervals is sorted by mean desc).
  const [selectedId, setSelectedId] = useState<number>(() => rankingIntervals[0]?.locationId ?? 0)

  // Bins are auto-zoomed per location, so read this location's own edges.
  const edges = histogram.edgesByLocation[String(selectedId)] ?? []
  const counts = histogram.countsByLocation[String(selectedId)] ?? []
  const data: BinDatum[] = edges.slice(0, -1).map((edge, i) => ({
    bin: edge.toFixed(3),
    count: counts[i] ?? 0,
  }))

  // Label the X axis denser than before: aim for ~15 evenly spaced ticks and
  // derive the step from the actual bin count, so few-bin histograms show every
  // edge and many-bin ones stay legible. Rotated -45° labels keep them apart.
  const TARGET_TICKS = 15
  const tickStep = Math.max(1, Math.ceil(data.length / TARGET_TICKS))
  const xTickValues = data.filter((_, i) => i % tickStep === 0).map((d) => d.bin)

  const selected = rankingIntervals.find((r) => r.locationId === selectedId)
  // Bins are uniform width, so a C* value maps linearly to a pixel x across the
  // plot area; this lets the reference lines sit at exact C* values rather than
  // snapping to a bin boundary.
  const span = edges.length > 1 ? edges[edges.length - 1] - edges[0] : 0

  const ReferenceLines: BarCustomLayer<BinDatum> = ({ innerWidth, innerHeight }) => {
    if (!selected || span <= 0) return null
    const xOf = (v: number) => ((v - edges[0]) / span) * innerWidth
    const marks = [
      { v: selected.lower, dashed: true, label: '2,5 %' },
      { v: selected.mean, dashed: false, label: 'C̄*' },
      { v: selected.upper, dashed: true, label: '97,5 %' },
    ]
    return (
      <g>
        {marks.map((m) => (
          <g key={m.label} transform={`translate(${xOf(m.v)},0)`}>
            <line
              y1={0}
              y2={innerHeight}
              stroke={m.dashed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'}
              strokeWidth={1.5}
              strokeDasharray={m.dashed ? '4 4' : undefined}
            />
            <text y={-4} textAnchor="middle" fontSize={10} fill="hsl(var(--foreground))">
              {m.label}
            </text>
          </g>
        ))}
      </g>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor={`hist-loc-${filenameBase}`} className="text-xs text-muted-foreground">
          Локація:
        </label>
        <select
          id={`hist-loc-${filenameBase}`}
          value={selectedId}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {rankingIntervals.map((r) => (
            <option key={r.locationId} value={r.locationId}>
              {nameByLocationId?.[r.locationId] ?? `#${r.locationId}`}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={containerRef}
        style={{ height: 320 }}
        aria-label="Гістограма розподілу C* для обраної локації"
      >
        <ResponsiveBar<BinDatum>
          data={data}
          keys={['count']}
          indexBy="bin"
          margin={{ top: 24, right: 24, bottom: 52, left: 56 }}
          padding={0.15}
          colors={['hsl(var(--primary))']}
          enableLabel={false}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            legend: 'Частота',
            legendOffset: -44,
            legendPosition: 'middle',
          }}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: -45,
            tickValues: xTickValues,
            legend: 'C*',
            legendOffset: 44,
            legendPosition: 'middle',
          }}
          layers={['grid', 'axes', 'bars', ReferenceLines, 'markers', 'legends']}
          theme={getNivoTheme()}
          tooltip={({ data: row }) => (
            <div
              style={{
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
              }}
            >
              <div>C* ≈ {row.bin}</div>
              <div>Семплів: {row.count}</div>
            </div>
          )}
          ariaLabel="Гістограма розподілу C*"
        />
      </div>

      <ChartExportButtons
        containerRef={containerRef}
        filenameBase={`${filenameBase}-histogram`}
        label="Експорт гістограми:"
      />
    </div>
  )
}
