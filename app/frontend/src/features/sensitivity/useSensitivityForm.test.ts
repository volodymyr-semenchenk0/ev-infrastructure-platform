import { describe, expect, it } from 'vitest'

import {
  ITERATIONS_DEFAULT,
  ITERATIONS_MAX,
  ITERATIONS_MIN,
  PERTURBATION_DEFAULT,
  PERTURBATION_MAX,
  PERTURBATION_MIN,
  clampIterations,
  clampPerturbation,
} from './useSensitivityForm'

describe('clampIterations', () => {
  it('caps values below the lower bound', () => {
    expect(clampIterations(50)).toBe(ITERATIONS_MIN)
    expect(clampIterations(0)).toBe(ITERATIONS_MIN)
    expect(clampIterations(-100)).toBe(ITERATIONS_MIN)
  })

  it('caps values above the upper bound', () => {
    expect(clampIterations(200_000)).toBe(ITERATIONS_MAX)
    expect(clampIterations(1_000_000)).toBe(ITERATIONS_MAX)
  })

  it('passes through values inside the range and rounds floats', () => {
    expect(clampIterations(ITERATIONS_DEFAULT)).toBe(ITERATIONS_DEFAULT)
    expect(clampIterations(1234.7)).toBe(1235)
  })

  it('returns the lower bound for NaN', () => {
    expect(clampIterations(Number.NaN)).toBe(ITERATIONS_MIN)
  })
})

describe('clampPerturbation', () => {
  it('caps perturbation below the lower bound', () => {
    expect(clampPerturbation(0)).toBe(PERTURBATION_MIN)
    expect(clampPerturbation(-0.5)).toBe(PERTURBATION_MIN)
  })

  it('caps perturbation above the upper bound', () => {
    expect(clampPerturbation(1)).toBe(PERTURBATION_MAX)
    expect(clampPerturbation(0.8)).toBe(PERTURBATION_MAX)
  })

  it('passes through valid values', () => {
    expect(clampPerturbation(PERTURBATION_DEFAULT)).toBeCloseTo(PERTURBATION_DEFAULT, 6)
    expect(clampPerturbation(0.25)).toBeCloseTo(0.25, 6)
  })
})
