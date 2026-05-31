import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function rankBgClass(rank: number, total: number): string {
  if (rank <= 3) return 'bg-green-50 dark:bg-green-950/30'
  if (rank > total - 4) return 'bg-red-50 dark:bg-red-950/30'
  return ''
}

export function RankingTable({
  rows,
  selectedLocationId,
  onRowClick,
}: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

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

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />
    return dir === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    )
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
              <SortIcon active={sortKey === 'rank'} dir={sortDir} />
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
              <SortIcon active={sortKey === 'closeness'} dir={sortDir} />
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
                rankBgClass(row.rank, rows.length),
                interactive && 'cursor-pointer hover:bg-accent/40',
                isSelected && 'outline outline-2 -outline-offset-1 outline-primary',
              )}
            >
              <TableCell data-testid="rank-cell" className="font-semibold">
                {row.rank}
              </TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.district ?? '—'}
              </TableCell>
              <TableCell className="font-mono">{row.closeness.toFixed(4)}</TableCell>
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
