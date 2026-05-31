import { useMemo, useRef } from 'react'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useCriteria } from '@/features/calculate/useCriteria'
import { ChartExportButtons } from '@/features/export/ChartExportButtons'
import { TabularExportButtons } from '@/features/export/TabularExportButtons'
import { WeightsBarChart } from '@/features/results/WeightsBarChart'
import { useSessionStore } from '@/store/session-store'

export function WeightsSection() {
  const weights = useSessionStore((s) => s.weights)
  const weightsFuzzy = useSessionStore((s) => s.weightsFuzzy)
  const consistencyRatio = useSessionStore((s) => s.consistencyRatio)
  const evaluationId = useSessionStore((s) => s.evaluationId)
  const ranking = useSessionStore((s) => s.ranking)
  const pendingRanking = useSessionStore((s) => s.pendingRanking)
  const revealRanking = useSessionStore((s) => s.revealRanking)
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
        lower: weightsFuzzy?.[code]?.l ?? null,
        upper: weightsFuzzy?.[code]?.u ?? null,
      }))
      .sort((a, b) => b.weight - a.weight)
  }, [weights, weightsFuzzy, criteriaNames])

  const csvRows = useMemo(
    () => [
      ['rank', 'code', 'name', 'weight', 'lower', 'upper'],
      ...sortedRows.map((row, idx) => [
        idx + 1,
        row.code,
        row.name,
        row.weight,
        row.lower ?? '',
        row.upper ?? '',
      ]),
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
        Обчислення ще не виконано. Натисніть «Обчислити ваги» в розділі матриці.
      </p>
    )
  }

  const filenameBase = `fahp-weights-${evaluationId ?? 'session'}`

  // Footer total for the crisp weights only; Σw_j is 1 by construction. The
  // fuzzy bound columns are left without a total — their raw sums are not 1 and
  // carry no useful interpretation here.
  const weightSum = sortedRows.reduce((acc, r) => acc + r.weight, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Ваги критеріїв (FAHP)</h3>
          <ChartExportButtons containerRef={chartRef} filenameBase={filenameBase} />
        </div>
        <div ref={chartRef}>
          <WeightsBarChart
            weights={weights}
            weightsFuzzy={weightsFuzzy}
            criteriaNames={criteriaNames}
          />
        </div>
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-semibold">Вагові коефіцієнти критеріїв</h3>
        <p className="mt-1 max-w-[600px] text-sm text-muted-foreground">
          w_j — дефазифікована вага критерію (центроїд нечіткого трикутника), а l_j та
          u_j — нижня й верхня межі відповідного нечіткого числа. Рядки впорядковано за
          спаданням ваги.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Критерій</th>
              <th className="px-4 py-2 font-medium">Код</th>
              <th className="px-4 py-2 text-right font-medium">l_j</th>
              <th className="px-4 py-2 text-right font-medium">w_j</th>
              <th className="px-4 py-2 text-right font-medium">u_j</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr key={row.code} className="border-b last:border-b-0">
                <td className="px-4 py-2 tabular-nums">{idx + 1}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 font-mono text-muted-foreground">{row.code}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {row.lower !== null ? row.lower.toFixed(4) : '–'}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {row.weight.toFixed(4)}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {row.upper !== null ? row.upper.toFixed(4) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/40 font-medium">
              <td className="px-4 py-2" />
              <td className="px-4 py-2">Сума</td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2" />
              <td className="px-4 py-2 text-right font-mono tabular-nums">
                {weightSum.toFixed(4)}
              </td>
              <td className="px-4 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabularExportButtons
          csvRows={csvRows}
          jsonData={jsonPayload}
          filenameBase={filenameBase}
        />
        {ranking === null ? (
          <Button
            type="button"
            size="sm"
            disabled={pendingRanking === null}
            onClick={() => {
              revealRanking()
              toast({
                title: 'Ранжування виконано',
                description: 'TOPSIS застосовано до вагів FAHP. Перейдіть до кроку «Ранжування».',
              })
            }}
          >
            Виконати ранжування
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ранжування виконано (TOPSIS). Результат – на кроці «Ранжування».
          </p>
        )}
      </div>
    </div>
  )
}
