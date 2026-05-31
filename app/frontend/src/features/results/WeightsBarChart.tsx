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
  // Ascending sort: nivo places the first horizontal datum at the bottom, so
  // the largest weight ends up last → at the top, matching the table order.
  const data: WeightDatum[] = Object.entries(weights)
    .map(([code, weight]) => ({
      code,
      weight,
      name: criteriaNames?.[code] ?? code,
    }))
    .sort((a, b) => a.weight - b.weight)

  // Whiskers can reach past the tallest bar (u_i > w_i), so widen the value axis
  // to the largest upper bound, otherwise the right cap is clipped.
  const maxUpper = weightsFuzzy ? Math.max(...Object.values(weightsFuzzy).map((f) => f.u), 0) : 0

  // Draw the fuzzy interval [l, u] as a whisker on each bar. The crisp weight is
  // the centroid of the triple, so the bar end (= pixel of w) splits the band:
  // the [l, w] half lies over the dark bar and the [w, u] half over the light
  // background. Each half is stroked in the colour that contrasts its own
  // backdrop, so the whole whisker stays legible without a heavy outline.
  // For a horizontal layout, value 0 maps to bar.x and w to bar.width.
  const Whiskers: BarCustomLayer<WeightDatum> = ({ bars }) => {
    if (!weightsFuzzy) return null
    const onBar = 'hsl(var(--primary-foreground))' // light, over the dark bar
    const offBar = 'hsl(var(--foreground))' // dark, over the background
    return (
      <g strokeWidth={2} strokeLinecap="round">
        {bars.map((bar) => {
          const f = weightsFuzzy[String(bar.data.indexValue)]
          const value = bar.data.value ?? 0
          if (!f || value <= 0 || bar.width <= 0) return null
          const pxOf = (v: number) => bar.x + (v / value) * bar.width
          const xl = pxOf(f.l)
          const xu = pxOf(f.u)
          const xEnd = bar.x + bar.width // bar end = pixel of w
          const yMid = bar.y + bar.height / 2
          const cap = Math.min(6, bar.height / 2 - 1)
          return (
            <g key={bar.key}>
              <line x1={xl} x2={xEnd} y1={yMid} y2={yMid} stroke={onBar} />
              <line x1={xl} x2={xl} y1={yMid - cap} y2={yMid + cap} stroke={onBar} />
              <line x1={xEnd} x2={xu} y1={yMid} y2={yMid} stroke={offBar} />
              <line x1={xu} x2={xu} y1={yMid - cap} y2={yMid + cap} stroke={offBar} />
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <div>
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
          layers={weightsFuzzy ? ['grid', 'axes', 'bars', Whiskers, 'markers'] : undefined}
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
                {f && (
                  <div style={{ color: 'hsl(var(--muted-foreground))' }}>l = {f.l.toFixed(4)}</div>
                )}
                <div>w = {Number(value).toFixed(4)}</div>
                {f && (
                  <div style={{ color: 'hsl(var(--muted-foreground))' }}>u = {f.u.toFixed(4)}</div>
                )}
              </div>
            )
          }}
          ariaLabel="Ваги критеріїв"
        />
      </div>
      {weightsFuzzy && (
        <p className="mt-1 text-xs text-muted-foreground">Вуса — нечіткі межі ваги [l; u].</p>
      )}
    </div>
  )
}
