import { useMemo } from 'react'

import { useCriteria } from '@/features/calculate/useCriteria'
import { WeightsBarChart } from '@/features/results/WeightsBarChart'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/store/session-store'

const CR_THRESHOLD = 0.1
const CR_WARN_LIMIT = 0.15

function crColor(cr: number): string {
  if (cr <= CR_THRESHOLD) return 'text-emerald-700 dark:text-emerald-300'
  if (cr <= CR_WARN_LIMIT) return 'text-amber-700 dark:text-amber-300'
  return 'text-destructive'
}

export function WeightsSection() {
  const weights = useSessionStore((s) => s.weights)
  const consistencyRatio = useSessionStore((s) => s.consistencyRatio)
  const criteria = useCriteria()

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

  if (!weights) {
    return (
      <p className="text-sm text-muted-foreground">
        Обчислення ще не виконано. Натисніть «Обчислити ваги» в розділі матриці.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <WeightsBarChart weights={weights} criteriaNames={criteriaNames} />
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-1.5 pr-2 font-medium">Критерій</th>
            <th className="py-1.5 pr-2 font-medium">Код</th>
            <th className="py-1.5 text-right font-medium">w_j</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.code} className="border-b last:border-b-0">
              <td className="py-1.5 pr-2">{row.name}</td>
              <td className="py-1.5 pr-2 font-mono text-muted-foreground">
                {row.code}
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {row.weight.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {consistencyRatio !== null && (
        <p className="text-xs">
          Підсумкове CR ={' '}
          <span className={cn('font-semibold tabular-nums', crColor(consistencyRatio))}>
            {consistencyRatio.toFixed(3)}
          </span>
        </p>
      )}
    </div>
  )
}
