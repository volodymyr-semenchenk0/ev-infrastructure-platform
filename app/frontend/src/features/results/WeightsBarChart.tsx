import { ResponsiveBar } from '@nivo/bar'

import { getNivoTheme } from '@/lib/nivo-theme'

interface WeightsBarChartProps {
  weights: Record<string, number>
  criteriaNames?: Record<string, string>
}

interface WeightDatum {
  code: string
  weight: number
  name: string
  [key: string]: string | number
}

export function WeightsBarChart({ weights, criteriaNames }: WeightsBarChartProps) {
  const data: WeightDatum[] = Object.entries(weights)
    .map(([code, weight]) => ({
      code,
      weight,
      name: criteriaNames?.[code] ?? code,
    }))
    .sort((a, b) => b.weight - a.weight)

  return (
    <div style={{ height: 360 }}>
      <ResponsiveBar
        data={data}
        keys={['weight']}
        indexBy="code"
        layout="horizontal"
        margin={{ top: 8, right: 24, bottom: 32, left: 80 }}
        padding={0.25}
        valueFormat={(v) => Number(v).toFixed(4)}
        colors={['hsl(var(--primary))']}
        borderRadius={4}
        enableLabel={false}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          format: (v) => Number(v).toFixed(2),
        }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        theme={getNivoTheme()}
        tooltip={({ indexValue, value }) => {
          const row = data.find((d) => d.code === indexValue)
          return (
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
              <strong>{row?.name ?? indexValue}</strong>
              <div>w = {Number(value).toFixed(4)}</div>
            </div>
          )
        }}
        ariaLabel="Ваги критеріїв"
      />
    </div>
  )
}
