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

// The canonical comparison ranks the full set of 12 candidate locations, so the
// Y axis always spans 12 ranks regardless of how many bars are shown.
const TOTAL_RANKS = 12

type SeriesKey = 'rankA' | 'rankB'

// Series labels mirror the difference-table column headers.
const SERIES: Record<SeriesKey, { label: string; color: string }> = {
  rankA: { label: 'Ранг за профілем A', color: 'hsl(var(--primary))' },
  rankB: { label: 'Ранг за профілем B', color: 'hsl(217 91% 60%)' },
}

export function GroupedBarChart({ rankings, nameByLocationId }: GroupedBarChartProps) {
  if (rankings.length === 0) {
    return null
  }

  // Invert the rank so rank 1 is the tallest bar (best on top).
  const display = (rank: number) => 1 + TOTAL_RANKS - rank

  const data: GroupedDatum[] = rankings.map((r) => ({
    location: nameByLocationId?.[r.locationId] ?? `#${r.locationId}`,
    rankA: display(r.rankA),
    rankB: display(r.rankB),
  }))

  return (
    <div style={{ height: 460 }}>
      <ResponsiveBar<GroupedDatum>
        data={data}
        keys={['rankA', 'rankB']}
        indexBy="location"
        groupMode="grouped"
        layout="vertical"
        margin={{ top: 16, right: 24, bottom: 120, left: 48 }}
        padding={0.25}
        innerPadding={2}
        minValue={0}
        maxValue={TOTAL_RANKS}
        colors={({ id }) => SERIES[id as SeriesKey].color}
        borderRadius={2}
        enableLabel={false}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickValues: Array.from({ length: TOTAL_RANKS }, (_, i) => i + 1),
          format: (v) => String(1 + TOTAL_RANKS - Number(v)),
        }}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -45,
        }}
        theme={getNivoTheme()}
        tooltip={({ id, value, indexValue }) => {
          const actual = 1 + TOTAL_RANKS - Number(value)
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
                {SERIES[id as SeriesKey].label}: {actual}
              </div>
            </div>
          )
        }}
        legends={[
          {
            dataFrom: 'keys',
            data: (['rankA', 'rankB'] as const).map((id) => ({
              id,
              label: SERIES[id].label,
              color: SERIES[id].color,
            })),
            anchor: 'bottom',
            direction: 'row',
            translateY: 100,
            itemsSpacing: 24,
            itemWidth: 170,
            itemHeight: 16,
            symbolSize: 10,
            symbolShape: 'square',
          },
        ]}
        ariaLabel="Порівняння рангів за двома профілями"
      />
    </div>
  )
}
