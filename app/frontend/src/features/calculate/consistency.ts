import type { PairwiseMatrix } from './saaty-scale'

// Saaty's Random Index (RI) for matrices of size n=1..15.
// Reference: Saaty (1980), Table 4.2.
// Indexed by matrix size n directly: RANDOM_INDEX[n].
// Index 0 unused; n=1 and n=2 are 0 by definition.
export const RANDOM_INDEX: readonly number[] = [
  0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56,
  1.57, 1.59,
] as const

export interface ConsistencyStats {
  lambdaMax: number
  ci: number
  ri: number
  cr: number
  // Priority vector from Saaty's column-mean normalisation; same length as
  // the matrix side. Used by findInconsistentPairs.
  priorities: number[]
}

// Approximate λ_max via Saaty's column-mean normalisation:
//   1) divide every column by its sum (column-stochastic A')
//   2) row-average A' → priority vector w
//   3) λ_max = (1/n) · Σ (Aw)_i / w_i
// Then CI = (λ_max − n)/(n − 1) and CR = CI / RI.
export function computeConsistencyStats(matrix: PairwiseMatrix): ConsistencyStats {
  const n = matrix.length
  if (n < 2) {
    return {
      lambdaMax: n,
      ci: 0,
      ri: 0,
      cr: 0,
      priorities: Array(Math.max(n, 0)).fill(n === 0 ? 0 : 1 / n),
    }
  }

  const a: number[][] = matrix.map((row) => row.map((tfn) => tfn.m))

  const colSums: number[] = Array.from({ length: n }, (_, j) =>
    a.reduce((acc, row) => acc + row[j], 0),
  )

  const normalised: number[][] = a.map((row) =>
    row.map((v, j) => v / colSums[j]),
  )

  const priorities: number[] = normalised.map(
    (row) => row.reduce((acc, v) => acc + v, 0) / n,
  )

  // Aw — multiply original A by priority vector
  const aw: number[] = a.map((row) =>
    row.reduce((acc, v, j) => acc + v * priorities[j], 0),
  )

  const lambdaMax = aw.reduce((acc, awi, i) => acc + awi / priorities[i], 0) / n
  const ci = (lambdaMax - n) / (n - 1)
  const ri = RANDOM_INDEX[n] ?? 1.49
  if (ri === 0) {
    return { lambdaMax, ci, ri: 0, cr: 0, priorities }
  }
  const crRaw = ci / ri
  return { lambdaMax, ci, ri, cr: crRaw < 0 ? 0 : crRaw, priorities }
}

export function computeCR(matrix: PairwiseMatrix): number {
  return computeConsistencyStats(matrix).cr
}

export interface InconsistentPair {
  i: number
  j: number
  // Log-residual: how far the modal value m_ij is from the consistent ratio
  // priorities[i] / priorities[j]. Larger absolute residual means the pair
  // contributes more to the matrix's overall inconsistency.
  residual: number
}

// Return the `count` most inconsistent upper-triangle pairs, sorted by
// descending |residual|. Diagonal and lower triangle are skipped because
// TFN reciprocity makes the lower-triangle residuals mirror the upper
// triangle.
export function findInconsistentPairs(
  matrix: PairwiseMatrix,
  count = 3,
): InconsistentPair[] {
  const n = matrix.length
  if (n < 3) return []
  const { priorities } = computeConsistencyStats(matrix)
  const pairs: InconsistentPair[] = []
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const wi = priorities[i]
      const wj = priorities[j]
      if (wi === 0 || wj === 0) continue
      const actual = matrix[i][j].m
      if (actual <= 0) continue
      const residual = Math.log(actual) - Math.log(wi / wj)
      pairs.push({ i, j, residual })
    }
  }
  pairs.sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual))
  return pairs.slice(0, count)
}
