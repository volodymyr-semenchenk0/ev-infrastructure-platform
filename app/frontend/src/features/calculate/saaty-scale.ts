export interface FuzzyNumber {
  l: number
  m: number
  u: number
}

export type PairwiseMatrix = FuzzyNumber[][]

const SAATY_MIN = 1 / 9
const SAATY_MAX = 9

export const SAATY_VALUES: readonly number[] = [
  1 / 9,
  1 / 7,
  1 / 5,
  1 / 3,
  1,
  3,
  5,
  7,
  9,
] as const

function clamp(value: number): number {
  if (value < SAATY_MIN) return SAATY_MIN
  if (value > SAATY_MAX) return SAATY_MAX
  return value
}

// Triangular spread around modal m: for integer m≥1, (m-1, m, m+1);
// for fractional m<1, reciprocal of the spread of 1/m. Bounds clamped to [1/9, 9].
export function mToTfn(m: number): FuzzyNumber {
  if (m === 1) return { l: 1, m: 1, u: 1 }
  if (m >= 1) {
    return {
      l: clamp(m - 1 < 1 ? 1 : m - 1),
      m,
      u: clamp(m + 1),
    }
  }
  // m < 1 — derive as reciprocal of mToTfn(1/m)
  const inv = mToTfn(1 / m)
  return {
    l: 1 / inv.u,
    m: 1 / inv.m,
    u: 1 / inv.l,
  }
}

export function reciprocalTfn(tfn: FuzzyNumber): FuzzyNumber {
  return {
    l: 1 / tfn.u,
    m: 1 / tfn.m,
    u: 1 / tfn.l,
  }
}

export function identityMatrix(n: number): PairwiseMatrix {
  return Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ l: 1, m: 1, u: 1 })),
  )
}

export function formatSaatyValue(value: number): string {
  if (value >= 1) return String(Math.round(value))
  const inv = Math.round(1 / value)
  return `1/${inv}`
}
