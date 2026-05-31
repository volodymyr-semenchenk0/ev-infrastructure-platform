import { useRef } from 'react'
import { ResponsiveLine, type CustomLayer } from '@nivo/line'

import { ChartExportButtons } from '@/features/export/ChartExportButtons'
import { getNivoTheme } from '@/lib/nivo-theme'

import type { ConfidenceInterval, SensitivityResponse } from './useSensitivity'

// Top locations charted by default; more lines crowd a log-scale plot and the
// reader only needs the leaders to judge convergence.
const MAX_SERIES = 5

interface ConvergenceChartProps {
  convergence: SensitivityResponse['convergence']
  // Used only to pick and order the top-N locations by mean C*.
  rankingIntervals: ConfidenceInterval[]
  nameByLocationId?: Record<number, string>
  filenameBase: string
}

export function ConvergenceChart({
  convergence,
  rankingIntervals,
  nameByLocationId,
  filenameBase,
}: ConvergenceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const series = rankingIntervals.slice(0, MAX_SERIES).map((r) => {
    const values = convergence.meanByLocation[String(r.locationId)] ?? []
    return {
      id: nameByLocationId?.[r.locationId] ?? `#${r.locationId}`,
      data: convergence.iterations.map((it, i) => ({ x: it, y: values[i] ?? null })),
    }
  })

  // Name each line at its right end so series stay distinguishable without
  // relying on colour alone.
  const EndLabels: CustomLayer = ({ series: computed }) => (
    <g>
      {computed.map((s) => {
        const last = s.data[s.data.length - 1]
        if (!last) return null
        return (
          <text
            key={s.id}
            x={last.position.x + 6}
            y={last.position.y}
            dominantBaseline="middle"
            fontSize={10}
            fill={s.color ?? 'hsl(var(--foreground))'}
          >
            {s.id}
          </text>
        )
      })}
    </g>
  )

  if (series.length === 0) {
    return null
  }

  // X axis shows exactly three ticks: the first iteration (1), the midpoint
  // (half of the iteration count), and the maximum. The iterations array is
  // an ascending log-spaced sampling, so its last element is the max N.
  const maxIter = convergence.iterations[convergence.iterations.length - 1] ?? 1
  const xTickValues = [1, maxIter / 2, maxIter]

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        style={{ height: 340 }}
        aria-label="Збіжність середнього C* за кількістю ітерацій"
      >
        <ResponsiveLine
          data={series}
          margin={{ top: 16, right: 132, bottom: 52, left: 60 }}
          xScale={{ type: 'log', base: 10, min: 'auto', max: 'auto' }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          yFormat={(v) => Number(v).toFixed(4)}
          curve="monotoneX"
          enablePoints={false}
          enableGridX={false}
          colors={{ scheme: 'category10' }}
          theme={getNivoTheme()}
          axisBottom={{
            tickSize: 4,
            tickPadding: 6,
            tickValues: xTickValues,
            format: (v) => String(Math.round(Number(v))),
            legend: 'Ітерація N (логарифмічна шкала)',
            legendPosition: 'middle',
            legendOffset: 44,
          }}
          axisLeft={{
            tickSize: 4,
            tickPadding: 6,
            legend: 'Середнє C*',
            legendPosition: 'middle',
            legendOffset: -48,
            format: (v) => Number(v).toFixed(3),
          }}
          layers={['grid', 'markers', 'axes', 'areas', 'lines', 'mesh', EndLabels]}
          useMesh
        />
      </div>

      <ChartExportButtons
        containerRef={containerRef}
        filenameBase={`${filenameBase}-convergence`}
        label="Експорт збіжності:"
      />
    </div>
  )
}
