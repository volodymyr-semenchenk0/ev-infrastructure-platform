import { ResponsiveBar } from '@nivo/bar'

import { getNivoTheme } from '@/lib/nivo-theme'

interface RankingPair {
  locationId: number
  rankA: number
  rankB: number
}

interface GroupedBarChartProps {
  rankings: RankingPair[]
  nameByLocationId?: Record<number, string>
}

interface GroupedDatum {
  location: string
  rankA: number
  rankB: number
  [key: string]: string | number
}

export function GroupedBarChart({
  rankings,
  nameByLocationId,
}: GroupedBarChartProps) {
  if (rankings.length === 0) {
    return null
  }

  const totalRanks = rankings.length
  // Render inverted rank scale (rank=1 visually at the top): we plot
  // `1 + total - rank`, so the best rank produces the tallest bar.
  const display = (rank: number) => 1 + totalRanks - rank

  const data: GroupedDatum[] = rankings.map((r) => ({
    location:
      nameByLocationId?.[r.locationId] ?? `#${r.locationId}`,
    rankA: display(r.rankA),
    rankB: display(r.rankB),
  }))

  return (
    <div style={{ height: 420 }}>
      <ResponsiveBar<GroupedDatum>
        data={data}
        keys={['rankA', 'rankB']}
        indexBy="location"
        groupMode="grouped"
        layout="vertical"
        margin={{ top: 16, right: 24, bottom: 96, left: 64 }}
        padding={0.25}
        innerPadding={2}
        minValue={0}
        maxValue={totalRanks}
        colors={({ id }) =>
          id === 'rankA' ? 'hsl(var(--primary))' : 'hsl(217 91% 60%)'
        }
        borderRadius={2}
        enableLabel={false}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: 'Ранг (1 — найкращий, угорі)',
          legendOffset: -52,
          legendPosition: 'middle',
          format: (v) => String(1 + totalRanks - Number(v)),
        }}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -45,
        }}
        theme={getNivoTheme()}
        tooltip={({ id, value, indexValue }) => {
          const actual = 1 + totalRanks - Number(value)
          const label = id === 'rankA' ? 'Розрахунок A' : 'Розрахунок B'
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
              <div className="font-medium">{indexValue}</div>
              <div>
                {label}: ранг {actual}
              </div>
            </div>
          )
        }}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'top-right',
            direction: 'row',
            translateY: -8,
            itemsSpacing: 12,
            itemWidth: 110,
            itemHeight: 16,
            symbolSize: 10,
            symbolShape: 'square',
          },
        ]}
        ariaLabel="Порівняння рангів двох розрахунків"
      />
    </div>
  )
}
