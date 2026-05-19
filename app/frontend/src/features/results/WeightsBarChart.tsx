import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface WeightsBarChartProps {
  weights: Record<string, number>
  criteriaNames?: Record<string, string>
}

export function WeightsBarChart({ weights, criteriaNames }: WeightsBarChartProps) {
  const data = Object.entries(weights)
    .map(([code, weight]) => ({
      code,
      weight,
      name: criteriaNames?.[code] ?? code,
    }))
    .sort((a, b) => b.weight - a.weight)

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 8, left: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          type="number"
          domain={[0, 'dataMax']}
          tickFormatter={(v: number) => v.toFixed(2)}
          fontSize={12}
        />
        <YAxis
          dataKey="code"
          type="category"
          width={75}
          fontSize={12}
          tick={{ fill: 'currentColor' }}
        />
        <Tooltip
          formatter={(value: number) => value.toFixed(4)}
          labelFormatter={(label: string) => {
            const row = data.find((d) => d.code === label)
            return row?.name ?? label
          }}
        />
        <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
