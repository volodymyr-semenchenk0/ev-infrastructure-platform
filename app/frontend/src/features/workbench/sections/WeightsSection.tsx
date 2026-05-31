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
        Обчислення ще не виконано. Натисніть «Обчислити ваги» в розділі матриці.
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
              ID розрахунку:{' '}
              <span className="font-mono text-foreground">{evaluationId}</span>
            </span>
          )}
          {consistencyRatio !== null && (
            <span>
              CR:{' '}
              <span className="font-mono text-foreground">
                {consistencyRatio.toFixed(3)}
              </span>
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

      {ranking === null ? (
        <div className="flex justify-end border-t pt-4">
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
        </div>
      ) : (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          Ранжування виконано (TOPSIS). Результат – на кроці «Ранжування».
        </p>
      )}
    </div>
  )
}
