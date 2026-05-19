import { ResponsiveBar, type BarCustomLayer } from '@nivo/bar'

import { getNivoTheme } from '@/lib/nivo-theme'

import type { ConfidenceInterval } from './useSensitivity'

interface ConfidenceIntervalsChartProps {
  confidenceIntervals: ConfidenceInterval[]
  nameByLocationId?: Record<number, string>
}

interface CiDatum {
  location: string
  mean: number
  low: number
  high: number
  [key: string]: string | number
}

const ErrorBarsLayer: BarCustomLayer<CiDatum> = ({ bars, yScale }) => {
  // yScale maps numeric domain values to pixel coordinates inside the chart area.
  // The chart group is already translated by `margin.top + margin.left`, so the
  // SVG primitives here use chart-local coordinates returned by Nivo.
  const scale = yScale as (value: number) => number
  return (
    <g>
      {bars.map((bar) => {
        const datum = bar.data.data
        const x = bar.x + bar.width / 2
        const yLow = scale(datum.low)
        const yHigh = scale(datum.high)
        return (
          <g key={`err-${bar.key}`} stroke="hsl(var(--foreground))" strokeWidth={1.5}>
            <line x1={x} x2={x} y1={yLow} y2={yHigh} />
            <line x1={x - 6} x2={x + 6} y1={yLow} y2={yLow} />
            <line x1={x - 6} x2={x + 6} y1={yHigh} y2={yHigh} />
          </g>
        )
      })}
    </g>
  )
}

export function ConfidenceIntervalsChart({
  confidenceIntervals,
  nameByLocationId,
}: ConfidenceIntervalsChartProps) {
  const data: CiDatum[] = confidenceIntervals.map((ci, idx) => {
    const label = nameByLocationId?.[ci.locationId] ?? `#${ci.locationId}`
    return {
      location: `${idx + 1}. ${label}`,
      mean: (ci.low + ci.high) / 2,
      low: ci.low,
      high: ci.high,
    }
  })

  if (data.length === 0) {
    return null
  }

  return (
    <div style={{ height: 420 }}>
      <ResponsiveBar<CiDatum>
        data={data}
        keys={['mean']}
        indexBy="location"
        layout="vertical"
        margin={{ top: 16, right: 24, bottom: 96, left: 56 }}
        padding={0.3}
        valueFormat={(v) => Number(v).toFixed(3)}
        colors={['hsl(var(--primary))']}
        borderRadius={2}
        enableLabel={false}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: 'C* (closeness)',
          legendOffset: -44,
          legendPosition: 'middle',
        }}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -45,
        }}
        layers={[
          'grid',
          'axes',
          'bars',
          ErrorBarsLayer as BarCustomLayer<CiDatum>,
          'markers',
          'legends',
        ]}
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
            <div className="font-medium">{row.location}</div>
            <div>C̄* = {row.mean.toFixed(4)}</div>
            <div>
              95% CI = [{row.low.toFixed(4)}; {row.high.toFixed(4)}]
            </div>
          </div>
        )}
        ariaLabel="95% довірчі інтервали C*"
      />
    </div>
  )
}
