import { create } from 'zustand'

import type { components } from '@/types/api'

// Types mirror the Pydantic schemas under app/backend/schemas/.
// `FuzzyNumber`, `RankingItemRead`, and `SensitivityRead` are the source of
// truth; do not re-declare them locally.
export type FuzzyNumber = components['schemas']['FuzzyNumber']
export type RankingItem = components['schemas']['RankingItemRead']
export type SensitivityResult = components['schemas']['SensitivityRead']

export interface SessionError {
  message: string
  // Optional source tag — handy for routing toasts back to the originating
  // accordion section in tasks 6-10.
  source?: 'matrix' | 'fahp' | 'topsis' | 'sensitivity' | 'unknown'
}

export interface SensitivityParams {
  iterations: number
  perturbation: number
}

export interface SessionState {
  pairwiseMatrix: FuzzyNumber[][] | null
  weights: Record<string, number> | null
  consistencyRatio: number | null
  ranking: RankingItem[] | null
  sensitivity: SensitivityResult | null
  // Parameters of the last Monte Carlo run; the API response does not echo
  // them, so /details#mc reads them from here.
  lastSensitivityParams: SensitivityParams | null
  evaluationId: number | null
  lastError: SessionError | null
  // Two-way sync for the ranking section and the map. The session is the
  // single source of truth so the sidebar table, the map markers, and any
  // future popovers stay in lockstep without prop-drilling.
  selectedLocationId: number | null
  // When true, MapPane colours markers by p_i(1) intensity instead of rank
  // (UI_PLAN §5.2.5 «Шар стійкості»). Stays false until the first MC run.
  stabilityLayerEnabled: boolean

  setPairwiseMatrix: (matrix: FuzzyNumber[][] | null) => void
  setWeights: (weights: Record<string, number> | null, consistencyRatio?: number | null) => void
  setRanking: (ranking: RankingItem[] | null) => void
  setSensitivity: (
    sensitivity: SensitivityResult | null,
    params?: SensitivityParams | null,
  ) => void
  setEvaluationId: (id: number | null) => void
  setError: (error: SessionError | null) => void
  setSelectedLocationId: (id: number | null) => void
  setStabilityLayerEnabled: (enabled: boolean) => void
  // commitMatrix is the matrix editor's save path. It writes the matrix and
  // its CR together and wipes downstream artefacts (weights/ranking/sensitivity
  // and the evaluationId) because those were computed from the previous matrix.
  commitMatrix: (matrix: FuzzyNumber[][], consistencyRatio: number) => void
  resetSession: () => void
}

// Single source of truth for the empty session; reset and initial state must
// stay byte-identical, otherwise the workbench leaks stale data after the
// 'Скинути сеанс' button.
const EMPTY_SESSION = {
  pairwiseMatrix: null,
  weights: null,
  consistencyRatio: null,
  ranking: null,
  sensitivity: null,
  lastSensitivityParams: null,
  evaluationId: null,
  lastError: null,
  selectedLocationId: null,
  stabilityLayerEnabled: false,
} satisfies Pick<
  SessionState,
  | 'pairwiseMatrix'
  | 'weights'
  | 'consistencyRatio'
  | 'ranking'
  | 'sensitivity'
  | 'lastSensitivityParams'
  | 'evaluationId'
  | 'lastError'
  | 'selectedLocationId'
  | 'stabilityLayerEnabled'
>

export const useSessionStore = create<SessionState>((set) => ({
  ...EMPTY_SESSION,

  setPairwiseMatrix: (matrix) => set({ pairwiseMatrix: matrix }),

  setWeights: (weights, consistencyRatio) =>
    set((state) => ({
      weights,
      consistencyRatio:
        consistencyRatio !== undefined ? consistencyRatio : state.consistencyRatio,
    })),

  setRanking: (ranking) => set({ ranking }),

  setSensitivity: (sensitivity, params) =>
    set((state) => ({
      sensitivity,
      lastSensitivityParams:
        params === undefined ? state.lastSensitivityParams : params,
    })),

  setEvaluationId: (id) => set({ evaluationId: id }),

  setError: (error) => set({ lastError: error }),

  setSelectedLocationId: (id) => set({ selectedLocationId: id }),

  setStabilityLayerEnabled: (enabled) => set({ stabilityLayerEnabled: enabled }),

  commitMatrix: (matrix, consistencyRatio) =>
    set({
      pairwiseMatrix: matrix,
      consistencyRatio,
      weights: null,
      ranking: null,
      sensitivity: null,
      lastSensitivityParams: null,
      evaluationId: null,
      lastError: null,
      selectedLocationId: null,
      stabilityLayerEnabled: false,
    }),

  resetSession: () => set({ ...EMPTY_SESSION }),
}))
