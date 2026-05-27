import { describe, expect, it } from 'vitest'

import { findInconsistentPairs } from './consistency'
import { identityMatrix, mToTfn, reciprocalTfn } from './saaty-scale'
import type { PairwiseMatrix } from './saaty-scale'

function setPair(matrix: PairwiseMatrix, i: number, j: number, m: number): PairwiseMatrix {
  const next = matrix.map((row) => row.slice())
  const tfn = mToTfn(m)
  next[i][j] = tfn
  next[j][i] = reciprocalTfn(tfn)
  return next
}

describe('findInconsistentPairs', () => {
  it('returns an empty list for matrices smaller than 3x3', () => {
    expect(findInconsistentPairs(identityMatrix(2))).toEqual([])
    expect(findInconsistentPairs(identityMatrix(1))).toEqual([])
  })

  it('returns no pairs for a perfectly consistent matrix', () => {
    // Identity: every pair already matches the consistent ratio w_i/w_j = 1.
    const pairs = findInconsistentPairs(identityMatrix(4))
    expect(pairs.every((p) => Math.abs(p.residual) < 1e-9)).toBe(true)
  })

  it('ranks the most distorted pair first when one entry is heavily inconsistent', () => {
    // Start from identity (perfect consistency), then push A0-A1 way off.
    const base = identityMatrix(4)
    const distorted = setPair(base, 0, 1, 9)
    const pairs = findInconsistentPairs(distorted, 3)
    expect(pairs.length).toBeGreaterThan(0)
    expect(pairs[0].i).toBe(0)
    expect(pairs[0].j).toBe(1)
    expect(Math.abs(pairs[0].residual)).toBeGreaterThan(0.5)
  })

  it('only considers upper-triangle pairs', () => {
    const distorted = setPair(identityMatrix(3), 1, 2, 7)
    const pairs = findInconsistentPairs(distorted)
    for (const p of pairs) {
      expect(p.i).toBeLessThan(p.j)
    }
  })

  it('respects the `count` parameter', () => {
    const distorted = setPair(setPair(identityMatrix(4), 0, 1, 9), 2, 3, 7)
    expect(findInconsistentPairs(distorted, 1)).toHaveLength(1)
    expect(findInconsistentPairs(distorted, 6).length).toBeLessThanOrEqual(6)
  })
})
