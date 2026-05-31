import { ResponsiveBar, type BarCustomLayer } from '@nivo/bar'

import { getNivoTheme } from '@/lib/nivo-theme'

interface FuzzyWeight {
  l: number
  m: number
  u: number
}

interface WeightsBarChartProps {
  weights: Record<string, number>
  weightsFuzzy?: Record<string, FuzzyWeight> | null
  criteriaNames?: Record<string, string>
}

interface WeightDatum {
  code: string
  weight: number
  name: string
  [key: string]: string | number
}

export function WeightsBarChart({ weights, weightsFuzzy, criteriaNames }: WeightsBarChartProps) {
  const data: WeightDatum[] = Object.entries(weights)
    .map(([code, weight]) => ({
      code,
      weight,
      name: criteriaNames?.[code] ?? code,
    }))
    .sort((a, b) => b.weight - a.weight)

  // Whiskers can reach past the tallest bar (u_i > w_i), so widen the value axis
  // to the largest upper bound, otherwise the right cap is clipped.
  const maxUpper = weightsFuzzy
    ? Math.max(...Object.values(weightsFuzzy).map((f) => f.u), 0)
    : 0

  // Draw the fuzzy interval [l, u] as a whisker centred on each bar. The crisp
  // weight is the centroid of the triple, so the bar end sits inside the band.
  // For a horizontal layout, value 0 maps to bar.x and the weight to bar.width;
  // the scale is shared across bars, so a linear map suffices.
  const Whiskers: BarCustomLayer<WeightDatum> = ({ bars }) => {
    if (!weightsFuzzy) return null
    return (
      <g stroke="hsl(var(--foreground))" strokeWidth={1.5}>
        {bars.map((bar) => {
          const code = String(bar.data.indexValue)
          const f = weightsFuzzy[code]
          const value = bar.data.value ?? 0
          if (!f || value <= 0 || bar.width <= 0) return null
          const pxOf = (v: number) => bar.x + (v / value) * bar.width
          const x1 = pxOf(f.l)
          const x2 = pxOf(f.u)
          const yMid = bar.y + bar.height / 2
          const cap = Math.min(6, bar.height / 2)
          return (
            <g key={bar.key}>
              <line x1={x1} x2={x2} y1={yMid} y2={yMid} />
              <line x1={x1} x2={x1} y1={yMid - cap} y2={yMid + cap} />
              <line x1={x2} x2={x2} y1={yMid - cap} y2={yMid + cap} />
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <div style={{ height: 360 }}>
      <ResponsiveBar<WeightDatum>
        data={data}
        keys={['weight']}
        indexBy="code"
        layout="horizontal"
        margin={{ top: 8, right: 24, bottom: 32, left: 80 }}
        padding={0.25}
        maxValue={weightsFuzzy ? maxUpper * 1.02 : 'auto'}
        valueFormat={(v) => Number(v).toFixed(4)}
        colors={['hsl(var(--primary))']}
        borderRadius={4}
        enableLabel={false}
        layers={
          weightsFuzzy ? ['grid', 'axes', 'bars', Whiskers, 'markers'] : undefined
        }
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          format: (v) => Number(v).toFixed(2),
        }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        theme={getNivoTheme()}
        tooltip={({ indexValue, value }) => {
          const row = data.find((d) => d.code === indexValue)
          const f = weightsFuzzy?.[String(indexValue)]
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
              {f && (
                <div style={{ color: 'hsl(var(--muted-foreground))' }}>
                  [{f.l.toFixed(4)}; {f.u.toFixed(4)}]
                </div>
              )}
            </div>
          )
        }}
        ariaLabel="Ваги критеріїв"
      />
    </div>
  )
}
