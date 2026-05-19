import type { PairwiseMatrix } from './saaty-scale'

// Saaty's Random Index (RI) for matrices of size n=1..15.
// Reference: Saaty (1980), Table 4.2.
// Indexed by matrix size n directly: RANDOM_INDEX[n].
// Index 0 unused; n=1 and n=2 are 0 by definition.
export const RANDOM_INDEX: readonly number[] = [
  0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56,
  1.57, 1.59,
] as const

// Approximate λ_max via Saaty's column-mean normalisation:
//   1) divide every column by its sum (column-stochastic A')
//   2) row-average A' → priority vector w
//   3) λ_max = (1/n) · Σ (Aw)_i / w_i
// Then CI = (λ_max − n)/(n − 1) and CR = CI / RI.
export function computeCR(matrix: PairwiseMatrix): number {
  const n = matrix.length
  if (n < 2) return 0

  const a: number[][] = matrix.map((row) => row.map((tfn) => tfn.m))

  const colSums: number[] = Array.from({ length: n }, (_, j) =>
    a.reduce((acc, row) => acc + row[j], 0),
  )

  const normalised: number[][] = a.map((row) =>
    row.map((v, j) => v / colSums[j]),
  )

  const weights: number[] = normalised.map(
    (row) => row.reduce((acc, v) => acc + v, 0) / n,
  )

  // Aw — multiply original A by weights
  const aw: number[] = a.map((row) =>
    row.reduce((acc, v, j) => acc + v * weights[j], 0),
  )

  const lambdaMax = aw.reduce((acc, awi, i) => acc + awi / weights[i], 0) / n
  const ci = (lambdaMax - n) / (n - 1)
  const ri = RANDOM_INDEX[n] ?? 1.49
  if (ri === 0) return 0
  const cr = ci / ri
  return cr < 0 ? 0 : cr
}
