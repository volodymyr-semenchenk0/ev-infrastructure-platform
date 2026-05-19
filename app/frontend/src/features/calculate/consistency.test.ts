import { describe, it, expect } from 'vitest'
import { computeCR, RANDOM_INDEX } from './consistency'
import { identityMatrix, type PairwiseMatrix } from './saaty-scale'

describe('RANDOM_INDEX', () => {
  it('has Saaty 1980 RI values for n=3..10', () => {
    expect(RANDOM_INDEX[3]).toBeCloseTo(0.58)
    expect(RANDOM_INDEX[4]).toBeCloseTo(0.9)
    expect(RANDOM_INDEX[10]).toBeCloseTo(1.49)
  })
})

describe('computeCR', () => {
  it('returns 0 for 10×10 identity matrix', () => {
    expect(computeCR(identityMatrix(10))).toBeCloseTo(0, 6)
  })

  it('returns 0 for 3×3 identity matrix', () => {
    expect(computeCR(identityMatrix(3))).toBeCloseTo(0, 6)
  })

  it('returns 0 for a perfectly consistent 3×3 matrix', () => {
    // perfectly consistent: m_ik = m_ij * m_jk for all i, j, k
    // weights = (3, 2, 1) → m_12=3/2, m_13=3, m_23=2
    const m: PairwiseMatrix = [
      [
        { l: 1, m: 1, u: 1 },
        { l: 3 / 2, m: 3 / 2, u: 3 / 2 },
        { l: 3, m: 3, u: 3 },
      ],
      [
        { l: 2 / 3, m: 2 / 3, u: 2 / 3 },
        { l: 1, m: 1, u: 1 },
        { l: 2, m: 2, u: 2 },
      ],
      [
        { l: 1 / 3, m: 1 / 3, u: 1 / 3 },
        { l: 1 / 2, m: 1 / 2, u: 1 / 2 },
        { l: 1, m: 1, u: 1 },
      ],
    ]
    expect(computeCR(m)).toBeCloseTo(0, 4)
  })

  it('returns CR > 0.1 for a strongly inconsistent 3×3 matrix', () => {
    // cyclic preferences: A >> B, B >> C, but A << C (transitivity violated)
    const m: PairwiseMatrix = [
      [
        { l: 1, m: 1, u: 1 },
        { l: 9, m: 9, u: 9 },
        { l: 1 / 9, m: 1 / 9, u: 1 / 9 },
      ],
      [
        { l: 1 / 9, m: 1 / 9, u: 1 / 9 },
        { l: 1, m: 1, u: 1 },
        { l: 9, m: 9, u: 9 },
      ],
      [
        { l: 9, m: 9, u: 9 },
        { l: 1 / 9, m: 1 / 9, u: 1 / 9 },
        { l: 1, m: 1, u: 1 },
      ],
    ]
    const cr = computeCR(m)
    expect(cr).toBeGreaterThan(0.1)
  })
})
