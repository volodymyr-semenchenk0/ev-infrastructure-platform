import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SAATY_VALUES,
  formatSaatyValue,
  mToTfn,
  reciprocalTfn,
  type FuzzyNumber,
  type PairwiseMatrix,
} from './saaty-scale'

interface CriterionInfo {
  id: number
  code: string
  name?: string
}

interface AhpMatrixProps {
  criteria: CriterionInfo[]
  matrix: PairwiseMatrix
  onChange: (next: PairwiseMatrix) => void
}

function formatTfn(tfn: FuzzyNumber): string {
  return `(${formatSaatyValue(tfn.l)}, ${formatSaatyValue(tfn.m)}, ${formatSaatyValue(tfn.u)})`
}

function closestSaatyValue(m: number): number {
  return SAATY_VALUES.reduce((best, candidate) =>
    Math.abs(Math.log(candidate) - Math.log(m)) <
    Math.abs(Math.log(best) - Math.log(m))
      ? candidate
      : best,
  )
}

export function AhpMatrix({ criteria, matrix, onChange }: AhpMatrixProps) {
  const n = criteria.length

  const handleSelect = useCallback(
    (i: number, j: number, newM: number) => {
      const next = matrix.map((row) => row.slice())
      const tfn = mToTfn(newM)
      next[i][j] = tfn
      next[j][i] = reciprocalTfn(tfn)
      onChange(next)
    },
    [matrix, onChange],
  )

  return (
    <div className="overflow-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-20 border bg-muted/40 p-1.5"></th>
            {criteria.map((c) => (
              <th
                key={c.id}
                title={c.name}
                className="border bg-muted/40 px-2 py-1.5 font-semibold"
              >
                {c.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((rowCrit, i) => (
            <tr key={rowCrit.id}>
              <th
                title={rowCrit.name}
                className="border bg-muted/40 px-2 py-1.5 text-left font-semibold"
              >
                {rowCrit.code}
              </th>
              {criteria.map((_, j) => {
                if (i === j) {
                  return (
                    <td
                      key={j}
                      data-testid={`cell-${i}-${j}`}
                      className="border bg-muted/20 px-2 py-1.5 text-center text-muted-foreground"
                    >
                      1
                    </td>
                  )
                }
                if (i < j) {
                  const currentM = matrix[i][j].m
                  const snapped = closestSaatyValue(currentM)
                  return (
                    <td
                      key={j}
                      data-testid={`cell-${i}-${j}`}
                      className="border p-1"
                    >
                      <div className="flex flex-col items-stretch gap-1">
                        <Select
                          value={String(snapped)}
                          onValueChange={(v) =>
                            handleSelect(i, j, Number.parseFloat(v))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue>{formatSaatyValue(snapped)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {SAATY_VALUES.map((v) => (
                              <SelectItem key={v} value={String(v)}>
                                {formatSaatyValue(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTfn(matrix[i][j])}
                        </span>
                      </div>
                    </td>
                  )
                }
                return (
                  <td
                    key={j}
                    data-testid={`cell-${i}-${j}`}
                    className="border bg-muted/10 px-2 py-1.5 text-center text-muted-foreground"
                  >
                    {formatTfn(matrix[i][j])}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Шкала Saaty: m ∈ {'{'}1/9, 1/7, 1/5, 1/3, 1, 3, 5, 7, 9{'}'}. Верхній
        трикутник редагується, нижній — авто-reciprocal.
      </p>
      <p className="sr-only">Розмір матриці: {n}×{n}</p>
    </div>
  )
}
