import { useMemo } from 'react'
import {
  ResponsiveScatterPlot,
  type ScatterPlotLayerProps,
} from '@nivo/scatterplot'

import { getNivoTheme } from '@/lib/nivo-theme'

import type { RankingRow } from './RankingTable'

interface ClosenessScatterPlotProps {
  rows: RankingRow[]
}

interface Datum {
  x: number
  y: number
  name: string
  locationId: number
  [key: string]: number | string
}

const THRESHOLD = 0.5

function colorForCloseness(closeness: number): string {
  if (closeness >= 0.5) return '#22c55e'
  if (closeness >= 0.3) return '#f59e0b'
  return '#ef4444'
}

function ThresholdLine({
  yScale,
  innerWidth,
}: ScatterPlotLayerProps<Datum>): JSX.Element {
  const scale = yScale as (value: number) => number
  const y = scale(THRESHOLD)
  return (
    <g>
      <line
        x1={0}
        x2={innerWidth}
        y1={y}
        y2={y}
        stroke="hsl(var(--muted-foreground))"
        strokeDasharray="4 4"
        strokeWidth={1}
        opacity={0.7}
      />
      <text
        x={innerWidth - 4}
        y={y - 4}
        textAnchor="end"
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
      >
        C* = 0.5
      </text>
    </g>
  )
}

function ColoredNodes({ nodes }: ScatterPlotLayerProps<Datum>): JSX.Element {
  return (
    <g>
      {nodes.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.size / 2}
          fill={colorForCloseness(node.data.y)}
          stroke="hsl(var(--background))"
          strokeWidth={1}
        />
      ))}
    </g>
  )
}

export function ClosenessScatterPlot({ rows }: ClosenessScatterPlotProps) {
  const data = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.closeness - a.closeness)
    return [
      {
        id: 'closeness',
        data: sorted.map<Datum>((row, idx) => ({
          x: idx + 1,
          y: row.closeness,
          name: row.name,
          locationId: row.locationId,
        })),
      },
    ]
  }, [rows])

  const pointCount = data[0]?.data.length ?? 0

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-base font-semibold">
          Розподіл коефіцієнтів близькості
        </h3>
        <p className="text-sm text-muted-foreground">
          Локації впорядковані за спаданням C*. Колір кодує зону:
          зелений – C* ≥ 0.5, жовтий – 0.3 ≤ C* &lt; 0.5, червоний – C* &lt; 0.3.
        </p>
      </div>
      {pointCount === 0 ? (
        <p className="text-sm text-muted-foreground">Дані відсутні.</p>
      ) : (
        <div
          style={{ height: 320 }}
          aria-label="Розподіл коефіцієнтів близькості C* за рангом локації"
        >
          <ResponsiveScatterPlot<Datum>
            data={data}
            margin={{ top: 16, right: 24, bottom: 52, left: 60 }}
            xScale={{ type: 'linear', min: 0, max: pointCount + 1 }}
            yScale={{ type: 'linear', min: 0, max: 1 }}
            nodeSize={10}
            theme={getNivoTheme()}
            axisBottom={{
              tickSize: 4,
              tickPadding: 6,
              legend: 'Ранг локації',
              legendPosition: 'middle',
              legendOffset: 40,
              format: (v) => `${v}`,
            }}
            axisLeft={{
              tickSize: 4,
              tickPadding: 6,
              legend: 'Коефіцієнт близькості C*',
              legendPosition: 'middle',
              legendOffset: -48,
              format: (v) => Number(v).toFixed(2),
            }}
            layers={[
              'grid',
              'axes',
              ThresholdLine,
              ColoredNodes,
              'markers',
              'mesh',
              'legends',
              'annotations',
            ]}
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
                <div>Ранг: {node.data.x}</div>
                <div>C* = {node.data.y.toFixed(4)}</div>
              </div>
            )}
          />
        </div>
      )}
    </section>
  )
}
