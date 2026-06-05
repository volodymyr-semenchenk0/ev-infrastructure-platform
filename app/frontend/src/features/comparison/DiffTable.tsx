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
  return (
    <Table className="min-w-[440px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Локація</TableHead>
          <TableHead className="w-44">Ранг за профілем A</TableHead>
          <TableHead className="w-44">Ранг за профілем B</TableHead>
          <TableHead
            className="w-36"
            title="Різниця рангів за профілями A і B. Відʼємне значення означає, що профіль B оцінює локацію вище"
          >
            Різниця рангів
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {differences.map((row, index) => (
          <TableRow key={row.locationId}>
            <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
            <TableCell>{nameByLocationId?.[row.locationId] ?? `#${row.locationId}`}</TableCell>
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
