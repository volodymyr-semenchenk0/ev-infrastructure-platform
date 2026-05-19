import { ResponsiveHeatMap, type HeatMapDatum } from '@nivo/heatmap'

import { getNivoTheme } from '@/lib/nivo-theme'

interface StabilityHeatmapProps {
  stabilityMatrix: Record<string, number[]>
  fullNameByCode?: Record<string, string>
}

interface RowDatum {
  id: string
  data: HeatMapDatum[]
}

export function StabilityHeatmap({
  stabilityMatrix,
  fullNameByCode,
}: StabilityHeatmapProps) {
  const codes = Object.keys(stabilityMatrix)
  const n = codes.length
  if (n === 0) {
    return null
  }

  const rankLabels = Array.from({ length: n }, (_, i) => `R${i + 1}`)

  const data: RowDatum[] = codes.map((code) => ({
    id: code,
    data: stabilityMatrix[code].map((prob, idx) => ({
      x: rankLabels[idx],
      y: prob,
    })),
  }))

  return (
    <div style={{ height: 480 }}>
      <ResponsiveHeatMap<RowDatum['data'][number], { name?: string }>
        data={data}
        margin={{ top: 64, right: 32, bottom: 16, left: 96 }}
        valueFormat={(v) => `${((v ?? 0) * 100).toFixed(1)}%`}
        axisTop={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          legend: 'Позиція в ранжуванні',
          legendOffset: -48,
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: 'Локація',
          legendOffset: -72,
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
            <div className="font-medium">
              {fullNameByCode?.[String(cell.serieId)] ?? cell.serieId}
            </div>
            <div>Позиція: {cell.data.x}</div>
            <div>
              P(rank) = {((cell.data.y ?? 0) * 100).toFixed(2)}%
            </div>
          </div>
        )}
      />
    </div>
  )
}
