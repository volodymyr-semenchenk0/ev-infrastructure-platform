import { create } from 'zustand'

import type { components } from '@/types/api'

// Types mirror the Pydantic schemas under app/backend/schemas/.
// `FuzzyNumber`, `RankingItemRead`, and `SensitivityRead` are the source of
// truth; do not re-declare them locally.
export type FuzzyNumber = components['schemas']['FuzzyNumber']
export type FuzzyWeight = components['schemas']['FuzzyWeight']
export type RankingItem = components['schemas']['RankingItemRead']
export type SensitivityResult = components['schemas']['SensitivityRead']

export interface SessionError {
  message: string
  // Optional source tag — handy for routing toasts back to the originating
  // accordion section in tasks 6-10.
  source?: 'matrix' | 'fahp' | 'topsis' | 'sensitivity' | 'comparison' | 'unknown'
}

export interface SensitivityParams {
  iterations: number
  perturbation: number
}

export interface SessionState {
  pairwiseMatrix: FuzzyNumber[][] | null
  weights: Record<string, number> | null
  // Triangular fuzzy bounds {code: {l, m, u}} per criterion, normalised so each
  // crisp weight is the centroid of its triple. Null for legacy runs.
  weightsFuzzy: Record<string, FuzzyWeight> | null
  consistencyRatio: number | null
  ranking: RankingItem[] | null
  // TOPSIS ranking computed alongside FAHP weights server-side, but held back
  // until the operator explicitly runs ranking on the weights step. The
  // ranking step stays empty until `revealRanking` promotes this to `ranking`.
  pendingRanking: RankingItem[] | null
  sensitivity: SensitivityResult | null
  // Parameters of the last Monte Carlo run; the API response does not echo
  // them, so the MC details panel reads them from here.
  lastSensitivityParams: SensitivityParams | null
  evaluationId: number | null
  lastError: SessionError | null
  // Two-way sync for the ranking section and the map. The session is the
  // single source of truth so the ranking table, the map markers, and any
  // future popovers stay in lockstep without prop-drilling.
  selectedLocationId: number | null

  setPairwiseMatrix: (matrix: FuzzyNumber[][] | null) => void
  setWeights: (
    weights: Record<string, number> | null,
    consistencyRatio?: number | null,
    weightsFuzzy?: Record<string, FuzzyWeight> | null,
  ) => void
  setRanking: (ranking: RankingItem[] | null) => void
  setPendingRanking: (ranking: RankingItem[] | null) => void
  // Promote the held TOPSIS ranking into `ranking` (the "run ranking" action).
  revealRanking: () => void
  setSensitivity: (sensitivity: SensitivityResult | null, params?: SensitivityParams | null) => void
  setEvaluationId: (id: number | null) => void
  setError: (error: SessionError | null) => void
  setSelectedLocationId: (id: number | null) => void
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
  weightsFuzzy: null,
  consistencyRatio: null,
  ranking: null,
  pendingRanking: null,
  sensitivity: null,
  lastSensitivityParams: null,
  evaluationId: null,
  lastError: null,
  selectedLocationId: null,
} satisfies Pick<
  SessionState,
  | 'pairwiseMatrix'
  | 'weights'
  | 'weightsFuzzy'
  | 'consistencyRatio'
  | 'ranking'
  | 'pendingRanking'
  | 'sensitivity'
  | 'lastSensitivityParams'
  | 'evaluationId'
  | 'lastError'
  | 'selectedLocationId'
>

export const useSessionStore = create<SessionState>((set) => ({
  ...EMPTY_SESSION,

  setPairwiseMatrix: (matrix) => set({ pairwiseMatrix: matrix }),

  setWeights: (weights, consistencyRatio, weightsFuzzy) =>
    set((state) => ({
      weights,
      weightsFuzzy: weightsFuzzy ?? null,
      consistencyRatio: consistencyRatio !== undefined ? consistencyRatio : state.consistencyRatio,
    })),

  setRanking: (ranking) => set({ ranking }),

  setPendingRanking: (ranking) => set({ pendingRanking: ranking }),

  revealRanking: () => set((state) => ({ ranking: state.pendingRanking })),

  setSensitivity: (sensitivity, params) =>
    set((state) => ({
      sensitivity,
      lastSensitivityParams: params === undefined ? state.lastSensitivityParams : params,
    })),

  setEvaluationId: (id) => set({ evaluationId: id }),

  setError: (error) => set({ lastError: error }),

  setSelectedLocationId: (id) => set({ selectedLocationId: id }),

  commitMatrix: (matrix, consistencyRatio) =>
    set({
      pairwiseMatrix: matrix,
      consistencyRatio,
      weights: null,
      weightsFuzzy: null,
      ranking: null,
      pendingRanking: null,
      sensitivity: null,
      lastSensitivityParams: null,
      evaluationId: null,
      lastError: null,
      selectedLocationId: null,
    }),

  resetSession: () => set({ ...EMPTY_SESSION }),
}))
