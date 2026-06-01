import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { rankTier } from '@/lib/rank-tier'

export interface RankingRow {
  locationId: number
  rank: number
  closeness: number
  sPlus: number
  sMinus: number
  name: string
  district?: string | null
}

type SortKey = 'rank' | 'closeness'
type SortDir = 'asc' | 'desc'

interface RankingTableProps {
  rows: RankingRow[]
  // Optional two-way sync hooks. When `onRowClick` is set, the table renders
  // selectable rows; otherwise the table stays read-only and existing callers
  // do not pick up extra interactivity.
  selectedLocationId?: number | null
  onRowClick?: (locationId: number) => void
}

// Light row tints — same quartile tier as the map pins (colorByRank) but far
// less saturated so the table stays readable.
function rankTierBgClass(rank: number, total: number): string {
  switch (rankTier(rank, total)) {
    case 'top':
      return 'bg-green-50 dark:bg-green-950/20'
    case 'mid':
      return 'bg-amber-50 dark:bg-amber-950/20'
    case 'bottom':
      return 'bg-red-50 dark:bg-red-950/20'
    default:
      return ''
  }
}

// A pair of adjacent ranks whose C* differ by less than this fraction of the
// C* spread is flagged as practically indistinguishable.
const NEAR_TIE_REL_EPS = 0.02

// Location ids whose C* is within NEAR_TIE_REL_EPS of an adjacent rank.
function findNearTies(rows: RankingRow[]): Set<number> {
  const tied = new Set<number>()
  if (rows.length < 2) return tied
  const byRank = [...rows].sort((a, b) => a.rank - b.rank)
  const values = byRank.map((r) => r.closeness)
  const range = Math.max(...values) - Math.min(...values)
  if (range <= 0) return tied
  const eps = NEAR_TIE_REL_EPS * range
  for (let i = 0; i < byRank.length - 1; i++) {
    if (Math.abs(byRank[i].closeness - byRank[i + 1].closeness) < eps) {
      tied.add(byRank[i].locationId)
      tied.add(byRank[i + 1].locationId)
    }
  }
  return tied
}

export function RankingTable({
  rows,
  selectedLocationId,
  onRowClick,
}: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const tiedIds = useMemo(() => findNearTies(rows), [rows])

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const diff = av - bv
      return sortDir === 'asc' ? diff : -diff
    })
    return copy
  }, [rows, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'closeness' ? 'desc' : 'asc')
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">
            <button
              type="button"
              className="-mx-2 inline-flex items-center rounded px-2 py-1 hover:bg-accent"
              onClick={() => toggleSort('rank')}
            >
              Ранг
            </button>
          </TableHead>
          <TableHead>Локація</TableHead>
          <TableHead>Район</TableHead>
          <TableHead>
            <button
              type="button"
              className="-mx-2 inline-flex items-center rounded px-2 py-1 hover:bg-accent"
              onClick={() => toggleSort('closeness')}
              title="Коефіцієнт близькості C* — формула (1.14)"
            >
              C*
            </button>
          </TableHead>
          <TableHead title="Відстань до позитивного ідеалу — формула (1.13)">
            S+
          </TableHead>
          <TableHead title="Відстань до негативного ідеалу — формула (1.13)">
            S-
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => {
          const isSelected = selectedLocationId === row.locationId
          const interactive = Boolean(onRowClick)
          return (
            <TableRow
              key={row.locationId}
              aria-selected={interactive ? isSelected : undefined}
              onClick={interactive ? () => onRowClick?.(row.locationId) : undefined}
              tabIndex={interactive ? 0 : undefined}
              onKeyDown={
                interactive
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick?.(row.locationId)
                      }
                    }
                  : undefined
              }
              className={cn(
                rankTierBgClass(row.rank, rows.length),
                interactive && 'cursor-pointer hover:bg-accent/40',
                isSelected && 'outline outline-2 -outline-offset-1 outline-primary',
              )}
            >
              <TableCell data-testid="rank-cell" className="font-semibold">
                {row.rank}
              </TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.district ?? '–'}
              </TableCell>
              <TableCell className="font-mono">
                <span className="inline-flex items-center gap-1">
                  {row.closeness.toFixed(4)}
                  {tiedIds.has(row.locationId) && (
                    <span
                      className="cursor-help text-amber-600 dark:text-amber-400"
                      title="C* практично нерозрізнюваний із сусіднім рангом (різниця менша за 2 % діапазону C*)"
                      aria-label="практично нерозрізнюваний ранг"
                    >
                      ≈
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">
                {row.sPlus.toFixed(4)}
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">
                {row.sMinus.toFixed(4)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
