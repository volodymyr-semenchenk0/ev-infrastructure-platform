import { useMemo } from 'react'

import { useLocations } from '@/features/locations/useLocations'
import { ConfidenceIntervalsChart } from '@/features/sensitivity/ConfidenceIntervalsChart'
import { StabilityHeatmap } from '@/features/sensitivity/StabilityHeatmap'
import { useSessionStore } from '@/store/session-store'

import { IntermediatesGapNote } from './FahpDetails'

const K_VALUES = [1, 3, 5] as const
const MC_SEED = 42 // backend DEFAULT_SEED

export function McDetails() {
  const sensitivity = useSessionStore((s) => s.sensitivity)
  const params = useSessionStore((s) => s.lastSensitivityParams)
  const locations = useLocations()

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

  if (!sensitivity) {
    return (
      <p className="text-sm text-muted-foreground">
        Аналіз чутливості ще не виконано. Налаштуйте параметри та запустіть на
        панелі керування.
      </p>
    )
  }

  const sortedRows = Object.entries(sensitivity.stabilityMatrix)
    .map(([idStr, perK]) => ({
      locationId: Number(idStr),
      perK: perK as Record<string, number>,
    }))
    .sort((a, b) => (b.perK['1'] ?? 0) - (a.perK['1'] ?? 0))

  return (
    <div className="space-y-6">
      {params && (
        <dl className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-3">
          <Param label="Ітерацій N" value={params.iterations.toLocaleString('uk-UA')} />
          <Param label="Збурення δ" value={params.perturbation.toFixed(2)} />
          <Param label="Зерно ГВЧ" value={String(MC_SEED)} />
        </dl>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          95 % довірчі інтервали C* для топ-{sensitivity.confidenceIntervals.length}
        </h3>
        <ConfidenceIntervalsChart
          confidenceIntervals={sensitivity.confidenceIntervals}
          nameByLocationId={nameByLocationId}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Матриця стабільності p_i(k) (теплова карта)
        </h3>
        <StabilityHeatmap
          stabilityMatrix={sensitivity.stabilityMatrix}
          nameByLocationId={nameByLocationId}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Матриця стабільності p_i(k) (таблиця)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Локація</th>
              {K_VALUES.map((k) => (
                <th key={k} className="py-2 pr-3 text-right font-medium">
                  p_i({k})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ locationId, perK }) => {
              const label = nameByLocationId[locationId] ?? `#${locationId}`
              return (
                <tr key={locationId} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{label}</td>
                  {K_VALUES.map((k) => (
                    <td key={k} className="py-2 pr-3 text-right font-mono tabular-nums">
                      {((perK[String(k)] ?? 0) * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <IntermediatesGapNote
        items={['повна матриця p_i(k) для всіх k', 'гістограми C*']}
        formulas="формули (1.15)-(1.17)"
      />
    </div>
  )
}

interface ParamProps {
  label: string
  value: string
}

function Param({ label, value }: ParamProps) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-foreground">{value}</dd>
    </div>
  )
}
