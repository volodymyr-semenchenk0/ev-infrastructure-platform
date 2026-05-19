import { useMemo, useState } from 'react'

import type { SensitivityRequest } from './useSensitivity'

export const ITERATIONS_MIN = 100
export const ITERATIONS_MAX = 100_000
export const ITERATIONS_DEFAULT = 10_000

export const PERTURBATION_MIN = 0.01
export const PERTURBATION_MAX = 0.5
export const PERTURBATION_DEFAULT = 0.15

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

export function clampIterations(raw: number): number {
  return Math.round(clamp(raw, ITERATIONS_MIN, ITERATIONS_MAX))
}

export function clampPerturbation(raw: number): number {
  return clamp(raw, PERTURBATION_MIN, PERTURBATION_MAX)
}

export function useSensitivityForm() {
  const [iterations, setIterationsRaw] = useState<number>(ITERATIONS_DEFAULT)
  const [perturbation, setPerturbationRaw] = useState<number>(PERTURBATION_DEFAULT)

  const requestBody = useMemo<SensitivityRequest>(
    () => ({ iterations, perturbation }),
    [iterations, perturbation],
  )

  return {
    iterations,
    perturbation,
    setIterations: (v: number) => setIterationsRaw(clampIterations(v)),
    setPerturbation: (v: number) => setPerturbationRaw(clampPerturbation(v)),
    requestBody,
  }
}
