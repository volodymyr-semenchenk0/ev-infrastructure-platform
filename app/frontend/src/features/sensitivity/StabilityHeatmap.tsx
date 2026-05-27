import { ResponsiveHeatMap, type HeatMapDatum } from '@nivo/heatmap'

import { getNivoTheme } from '@/lib/nivo-theme'

// Cumulative top-k probabilities per formula (1.17) for the canonical set
// {1, 3, 5} fixed by subsection 2.3.3.
const K_VALUES = [1, 3, 5] as const

type TopKProbabilities = Record<string, number>

interface StabilityHeatmapProps {
  stabilityMatrix: Record<string, TopKProbabilities>
  nameByLocationId?: Record<number, string>
}

interface RowDatum {
  id: string
  data: HeatMapDatum[]
}

export function StabilityHeatmap({
  stabilityMatrix,
  nameByLocationId,
}: StabilityHeatmapProps) {
  const locationIds = Object.keys(stabilityMatrix)
  if (locationIds.length === 0) {
    return null
  }

  const data: RowDatum[] = locationIds.map((locationId) => {
    const entry = stabilityMatrix[locationId]
    const label = nameByLocationId?.[Number(locationId)] ?? `#${locationId}`
    return {
      id: label,
      data: K_VALUES.map((k) => ({
        x: `Top-${k}`,
        y: entry[String(k)] ?? 0,
      })),
    }
  })

  return (
    <div style={{ height: 480 }}>
      <ResponsiveHeatMap<RowDatum['data'][number], { name?: string }>
        data={data}
        margin={{ top: 64, right: 32, bottom: 16, left: 160 }}
        valueFormat={(v) => `${((v ?? 0) * 100).toFixed(1)}%`}
        axisTop={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          legend: 'Група топ-k',
          legendOffset: -48,
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: 'Локація',
          legendOffset: -132,
          legendPosition: 'middle',
        }}
        colors={{
          type: 'sequential',
          scheme: 'blues',
          minValue: 0,
          maxValue: 1,
        }}
        emptyColor="hsl(var(--muted))"
        borderColor="hsl(var(--background))"
        borderWidth={1}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        enableLabels
        theme={getNivoTheme()}
        tooltip={({ cell }) => (
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
            <div className="font-medium">{cell.serieId}</div>
            <div>{cell.data.x}</div>
            <div>
              p_i(k) = {((cell.data.y ?? 0) * 100).toFixed(2)}%
            </div>
          </div>
        )}
      />
    </div>
  )
}
