import { useMemo, useRef } from 'react'
import { Info } from 'lucide-react'

import { useCriteria } from '@/features/calculate/useCriteria'
import { ChartExportButtons } from '@/features/export/ChartExportButtons'
import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { WeightsBarChart } from '@/features/results/WeightsBarChart'
import { useSessionStore } from '@/store/session-store'

// /details#fahp renders what the current API exposes:
//   * final w_j (sorted desc)
//   * final CR
// The intermediates from formulas (1.7)-(1.9) are not yet returned by the
// backend. The inline note links to ADR-0001 explaining the gap.
export function FahpDetails() {
  const weights = useSessionStore((s) => s.weights)
  const consistencyRatio = useSessionStore((s) => s.consistencyRatio)
  const evaluationId = useSessionStore((s) => s.evaluationId)
  const criteria = useCriteria()

  const chartRef = useRef<HTMLDivElement>(null)

  const criteriaNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of criteria.data ?? []) {
      map[c.code] = c.name
    }
    return map
  }, [criteria.data])

  const sortedRows = useMemo(() => {
    if (!weights) return []
    return Object.entries(weights)
      .map(([code, weight]) => ({
        code,
        weight,
        name: criteriaNames[code] ?? code,
      }))
      .sort((a, b) => b.weight - a.weight)
  }, [weights, criteriaNames])

  const csvRows = useMemo(
    () => [
      ['rank', 'code', 'name', 'weight'],
      ...sortedRows.map((row, idx) => [idx + 1, row.code, row.name, row.weight]),
    ],
    [sortedRows],
  )

  const jsonPayload = useMemo(
    () => ({ evaluationId, consistencyRatio, weights: sortedRows }),
    [evaluationId, consistencyRatio, sortedRows],
  )

  if (!weights) {
    return (
      <p className="text-sm text-muted-foreground">
        FAHP ще не виконано. Виконайте розрахунок на панелі керування.
      </p>
    )
  }

  const filenameBase = `fahp-weights-${evaluationId ?? 'session'}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          {evaluationId !== null && (
            <span>
              ID розрахунку: <span className="font-mono text-foreground">{evaluationId}</span>
            </span>
          )}
          {consistencyRatio !== null && (
            <span>
              CR: <span className="font-mono text-foreground">{consistencyRatio.toFixed(3)}</span>
            </span>
          )}
        </div>
        <TabularExportButtons
          csvRows={csvRows}
          jsonData={jsonPayload}
          filenameBase={filenameBase}
        />
      </div>

      <div ref={chartRef}>
        <WeightsBarChart weights={weights} criteriaNames={criteriaNames} />
      </div>
      <ChartExportButtons
        containerRef={chartRef}
        filenameBase={filenameBase}
        label="Експорт діаграми:"
      />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Критерій</th>
            <th className="py-2 pr-3 font-medium">Код</th>
            <th className="py-2 text-right font-medium">w_j</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, idx) => (
            <tr key={row.code} className="border-b last:border-b-0">
              <td className="py-2 pr-3 tabular-nums">{idx + 1}</td>
              <td className="py-2 pr-3">{row.name}</td>
              <td className="py-2 pr-3 font-mono text-muted-foreground">{row.code}</td>
              <td className="py-2 text-right font-mono tabular-nums">
                {row.weight.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <IntermediatesGapNote
        items={['S_i = (l, m, u)', 'V(S_i ≥ S_k)', "d'(A_i)"]}
        formulas="формули (1.7)-(1.9)"
      />
    </div>
  )
}

interface IntermediatesGapNoteProps {
  items: string[]
  formulas: string
}

export function IntermediatesGapNote({ items, formulas }: IntermediatesGapNoteProps) {
  return (
    <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">Проміжні величини не виводяться у поточному API</p>
        <p className="mt-1">
          {`Поточний контракт не повертає `}
          {items.map((item, idx) => (
            <span key={item}>
              {idx > 0 && ', '}
              <span className="font-mono">{item}</span>
            </span>
          ))}
          {`. ${formulas}. Розширення контракту обговорено в ADR-0001.`}
        </p>
      </div>
    </div>
  )
}
