import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useProfileStore } from '@/store/profile-store'
import { useSessionStore, type FuzzyNumber } from '@/store/session-store'

import { useSidebarStatuses } from './useSidebarStatuses'

const MATRIX_2x2: FuzzyNumber[][] = [
  [
    { l: 1, m: 1, u: 1 },
    { l: 1, m: 2, u: 3 },
  ],
  [
    { l: 1 / 3, m: 1 / 2, u: 1 },
    { l: 1, m: 1, u: 1 },
  ],
]

function resetStores() {
  useSessionStore.getState().resetSession()
  useProfileStore.getState().setActiveProfile(null)
}

describe('useSidebarStatuses', () => {
  beforeEach(() => {
    resetStores()
  })

  it('starts every section idle when stores are empty', () => {
    const { result } = renderHook(() => useSidebarStatuses())
    expect(result.current).toEqual({
      profile: 'idle',
      matrix: 'idle',
      weights: 'idle',
      ranking: 'idle',
      sensitivity: 'idle',
    })
  })

  it('flips profile to ready when an active profile is set', () => {
    const { result } = renderHook(() => useSidebarStatuses())
    act(() => {
      useProfileStore.getState().setActiveProfile({
        id: 1,
        code: 'municipal',
        name: 'Муніципалітет',
      })
    })
    expect(result.current.profile).toBe('ready')
  })

  it('marks the matrix ready when filled and CR <= 0.10', () => {
    const { result } = renderHook(() => useSidebarStatuses())
    act(() => {
      useSessionStore.getState().setPairwiseMatrix(MATRIX_2x2)
      useSessionStore.getState().setWeights({ A: 0.5, B: 0.5 }, 0.05)
    })
    expect(result.current.matrix).toBe('ready')
  })

  it('marks the matrix attention when CR exceeds 0.10', () => {
    const { result } = renderHook(() => useSidebarStatuses())
    act(() => {
      useSessionStore.getState().setPairwiseMatrix(MATRIX_2x2)
      useSessionStore.getState().setWeights({ A: 0.5, B: 0.5 }, 0.18)
    })
    expect(result.current.matrix).toBe('attention')
  })

  it('marks weights, ranking, sensitivity ready once their data lands', () => {
    const { result } = renderHook(() => useSidebarStatuses())
    act(() => {
      useSessionStore.getState().setWeights({ A: 1 }, 0)
      useSessionStore.getState().setRanking([
        { locationId: 1, rank: 1, closeness: 0.9, sPlus: 0.1, sMinus: 0.5 },
      ])
      useSessionStore.getState().setSensitivity({
        stabilityMatrix: { '1': { '1': 1, '3': 1, '5': 1 } },
        confidenceIntervals: [{ locationId: 1, lower: 0.88, upper: 0.92 }],
      })
    })
    expect(result.current.weights).toBe('ready')
    expect(result.current.ranking).toBe('ready')
    expect(result.current.sensitivity).toBe('ready')
  })
})
