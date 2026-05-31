import { useRef } from 'react'
import { ResponsiveScatterPlot, type ScatterPlotLayerProps } from '@nivo/scatterplot'

import { ChartExportButtons } from '@/features/export/ChartExportButtons'
import { getNivoTheme } from '@/lib/nivo-theme'

import type { ConfidenceInterval } from './useSensitivity'

interface RankingForestPlotProps {
  // All locations, already ordered by mean C* descending (API contract).
  rankingIntervals: ConfidenceInterval[]
  nameByLocationId?: Record<number, string>
  filenameBase: string
}

interface ForestDatum {
  x: number // mean C*
  y: number // row index, 0 = best
  lower: number
  upper: number
  name: string
  locationId: number
  [key: string]: number | string
}

export function RankingForestPlot({
  rankingIntervals,
  nameByLocationId,
  filenameBase,
}: RankingForestPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (rankingIntervals.length === 0) {
    return null
  }

  const labels = rankingIntervals.map((r) => nameByLocationId?.[r.locationId] ?? `#${r.locationId}`)
  const data = [
    {
      id: 'ranking',
      data: rankingIntervals.map<ForestDatum>((r, i) => ({
        x: r.mean,
        y: i,
        lower: r.lower,
        upper: r.upper,
        name: labels[i],
        locationId: r.locationId,
      })),
    },
  ]

  // Pad the x-domain so the widest whisker is not clipped at the plot edge.
  const xMin = Math.max(0, Math.min(...rankingIntervals.map((r) => r.lower)) - 0.02)
  const xMax = Math.min(1, Math.max(...rankingIntervals.map((r) => r.upper)) + 0.02)

  const Whiskers = ({ xScale, nodes }: ScatterPlotLayerProps<ForestDatum>) => {
    const xs = xScale as (value: number) => number
    return (
      <g stroke="hsl(var(--muted-foreground))" strokeWidth={1.5}>
        {nodes.map((node) => {
          const x1 = xs(node.data.lower)
          const x2 = xs(node.data.upper)
          return (
            <g key={node.id}>
              <line x1={x1} x2={x2} y1={node.y} y2={node.y} />
              <line x1={x1} x2={x1} y1={node.y - 4} y2={node.y + 4} />
              <line x1={x2} x2={x2} y1={node.y - 4} y2={node.y + 4} />
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        style={{ height: 80 + rankingIntervals.length * 28 }}
        aria-label="Forest-plot інтервалів рангів за C*"
      >
        <ResponsiveScatterPlot<ForestDatum>
          data={data}
          margin={{ top: 16, right: 32, bottom: 52, left: 148 }}
          xScale={{ type: 'linear', min: xMin, max: xMax }}
          yScale={{ type: 'linear', min: -0.5, max: rankingIntervals.length - 0.5, reverse: true }}
          nodeSize={9}
          colors={['hsl(var(--primary))']}
          theme={getNivoTheme()}
          axisBottom={{
            tickSize: 4,
            tickPadding: 6,
            legend: 'C* (середнє та 95 % інтервал)',
            legendPosition: 'middle',
            legendOffset: 44,
            format: (v) => Number(v).toFixed(2),
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 6,
            tickValues: rankingIntervals.map((_, i) => i),
            format: (v) => labels[v as number] ?? '',
          }}
          layers={['grid', 'axes', Whiskers, 'nodes', 'mesh', 'markers']}
          tooltip={({ node }) => (
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
              <strong>{node.data.name}</strong>
              <div>C̄* = {node.data.x.toFixed(4)}</div>
              <div>
                95 % ДІ = [{node.data.lower.toFixed(4)}; {node.data.upper.toFixed(4)}]
              </div>
            </div>
          )}
        />
      </div>

      <ChartExportButtons
        containerRef={containerRef}
        filenameBase={`${filenameBase}-forest`}
        label="Експорт forest-plot:"
      />
    </div>
  )
}
