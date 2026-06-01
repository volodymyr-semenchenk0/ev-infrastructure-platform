import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import type { PairwiseDifference } from './useProfileComparison'

type SortKey = 'rankA' | 'rankB' | 'delta'
type SortDir = 'asc' | 'desc'

interface DiffTableProps {
  differences: PairwiseDifference[]
  nameByLocationId?: Record<number, string>
}

function deltaCellClass(delta: number): string {
  if (delta < 0) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
  if (delta > 0) return 'bg-red-50 text-red-700 dark:bg-red-950/40'
  return 'text-muted-foreground'
}

function formatDelta(delta: number): string {
  if (delta === 0) return '0'
  return delta > 0 ? `+${delta}` : String(delta)
}

export function DiffTable({ differences, nameByLocationId }: DiffTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rankA')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    const copy = [...differences]
    copy.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey]
      return sortDir === 'asc' ? diff : -diff
    })
    return copy
  }, [differences, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
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
          <TableHead>Локація</TableHead>
          <TableHead className="w-24">
            <button
              type="button"
              className="-mx-2 inline-flex items-center rounded px-2 py-1 hover:bg-accent"
              onClick={() => toggleSort('rankA')}
            >
              Ранг A
              <SortIcon active={sortKey === 'rankA'} dir={sortDir} />
            </button>
          </TableHead>
          <TableHead className="w-24">
            <button
              type="button"
              className="-mx-2 inline-flex items-center rounded px-2 py-1 hover:bg-accent"
              onClick={() => toggleSort('rankB')}
            >
              Ранг B
              <SortIcon active={sortKey === 'rankB'} dir={sortDir} />
            </button>
          </TableHead>
          <TableHead className="w-24" title="Δ = rankA − rankB (від'ємне — B краще)">
            <button
              type="button"
              className="-mx-2 inline-flex items-center rounded px-2 py-1 hover:bg-accent"
              onClick={() => toggleSort('delta')}
            >
              Δ
              <SortIcon active={sortKey === 'delta'} dir={sortDir} />
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.locationId}>
            <TableCell>
              {nameByLocationId?.[row.locationId] ?? `#${row.locationId}`}
            </TableCell>
            <TableCell className="font-mono">{row.rankA}</TableCell>
            <TableCell className="font-mono">{row.rankB}</TableCell>
            <TableCell
              data-testid="delta-cell"
              className={cn('font-mono font-semibold', deltaCellClass(row.delta))}
            >
              {formatDelta(row.delta)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
