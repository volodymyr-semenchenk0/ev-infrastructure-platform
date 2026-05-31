import { beforeEach, describe, expect, it } from 'vitest'

import {
  useSessionStore,
  type FuzzyNumber,
  type RankingItem,
  type SensitivityResult,
} from './session-store'

const SAMPLE_MATRIX: FuzzyNumber[][] = [
  [
    { l: 1, m: 1, u: 1 },
    { l: 1, m: 2, u: 3 },
  ],
  [
    { l: 1 / 3, m: 1 / 2, u: 1 },
    { l: 1, m: 1, u: 1 },
  ],
]

const SAMPLE_RANKING: RankingItem[] = [
  { locationId: 1, rank: 1, closeness: 0.82, sPlus: 0.1, sMinus: 0.45 },
  { locationId: 2, rank: 2, closeness: 0.55, sPlus: 0.2, sMinus: 0.25 },
]

const SAMPLE_SENSITIVITY: SensitivityResult = {
  stabilityMatrix: { '1': { '1': 0.9, '3': 0.99, '5': 1 } },
  confidenceIntervals: [{ locationId: 1, mean: 0.82, lower: 0.78, upper: 0.86 }],
}

function resetStore() {
  useSessionStore.getState().resetSession()
}

describe('useSessionStore', () => {
  beforeEach(() => {
    resetStore()
  })

  it('starts empty', () => {
    const state = useSessionStore.getState()
    expect(state.pairwiseMatrix).toBeNull()
    expect(state.weights).toBeNull()
    expect(state.consistencyRatio).toBeNull()
    expect(state.ranking).toBeNull()
    expect(state.sensitivity).toBeNull()
    expect(state.evaluationId).toBeNull()
    expect(state.lastError).toBeNull()
    expect(state.selectedLocationId).toBeNull()
  })

  it('tracks the selected location id', () => {
    useSessionStore.getState().setSelectedLocationId(7)
    expect(useSessionStore.getState().selectedLocationId).toBe(7)
    useSessionStore.getState().setSelectedLocationId(null)
    expect(useSessionStore.getState().selectedLocationId).toBeNull()
  })

  it('toggles the stability layer flag', () => {
    expect(useSessionStore.getState().stabilityLayerEnabled).toBe(false)
    useSessionStore.getState().setStabilityLayerEnabled(true)
    expect(useSessionStore.getState().stabilityLayerEnabled).toBe(true)
    useSessionStore.getState().resetSession()
    expect(useSessionStore.getState().stabilityLayerEnabled).toBe(false)
  })

  it('stores the pairwise matrix', () => {
    useSessionStore.getState().setPairwiseMatrix(SAMPLE_MATRIX)
    expect(useSessionStore.getState().pairwiseMatrix).toEqual(SAMPLE_MATRIX)
  })

  it('stores weights and consistency ratio together', () => {
    useSessionStore.getState().setWeights({ Pop_dens: 0.6, Traffic: 0.4 }, 0.07)
    const state = useSessionStore.getState()
    expect(state.weights).toEqual({ Pop_dens: 0.6, Traffic: 0.4 })
    expect(state.consistencyRatio).toBeCloseTo(0.07)
  })

  it('keeps the existing CR when setWeights omits it', () => {
    useSessionStore.getState().setWeights({ A: 1 }, 0.05)
    useSessionStore.getState().setWeights({ A: 0.5, B: 0.5 })
    expect(useSessionStore.getState().consistencyRatio).toBeCloseTo(0.05)
  })

  it('stores ranking, sensitivity, evaluationId, and error', () => {
    const store = useSessionStore.getState()
    store.setRanking(SAMPLE_RANKING)
    store.setSensitivity(SAMPLE_SENSITIVITY)
    store.setEvaluationId(42)
    store.setError({ message: 'CR > 0.10', source: 'matrix' })

    const state = useSessionStore.getState()
    expect(state.ranking).toEqual(SAMPLE_RANKING)
    expect(state.sensitivity).toEqual(SAMPLE_SENSITIVITY)
    expect(state.evaluationId).toBe(42)
    expect(state.lastError).toEqual({ message: 'CR > 0.10', source: 'matrix' })
  })

  it('commitMatrix writes matrix and CR while wiping downstream artefacts', () => {
    const store = useSessionStore.getState()
    store.setWeights({ A: 1 }, 0.05)
    store.setRanking(SAMPLE_RANKING)
    store.setSensitivity(SAMPLE_SENSITIVITY)
    store.setEvaluationId(7)
    store.setError({ message: 'boom' })

    store.commitMatrix(SAMPLE_MATRIX, 0.04)

    const state = useSessionStore.getState()
    expect(state.pairwiseMatrix).toEqual(SAMPLE_MATRIX)
    expect(state.consistencyRatio).toBe(0.04)
    expect(state.weights).toBeNull()
    expect(state.ranking).toBeNull()
    expect(state.sensitivity).toBeNull()
    expect(state.evaluationId).toBeNull()
    expect(state.lastError).toBeNull()
  })

  it('resetSession wipes every populated field', () => {
    const store = useSessionStore.getState()
    store.setPairwiseMatrix(SAMPLE_MATRIX)
    store.setWeights({ A: 1 }, 0.05)
    store.setRanking(SAMPLE_RANKING)
    store.setSensitivity(SAMPLE_SENSITIVITY)
    store.setEvaluationId(7)
    store.setError({ message: 'boom' })

    store.resetSession()

    const state = useSessionStore.getState()
    expect(state.pairwiseMatrix).toBeNull()
    expect(state.weights).toBeNull()
    expect(state.consistencyRatio).toBeNull()
    expect(state.ranking).toBeNull()
    expect(state.sensitivity).toBeNull()
    expect(state.evaluationId).toBeNull()
    expect(state.lastError).toBeNull()
  })
})
