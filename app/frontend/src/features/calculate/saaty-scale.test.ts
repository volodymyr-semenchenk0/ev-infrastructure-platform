import { describe, it, expect } from 'vitest'
import {
  SAATY_VALUES,
  mToTfn,
  reciprocalTfn,
  identityMatrix,
  formatSaatyValue,
} from './saaty-scale'

describe('SAATY_VALUES', () => {
  it('contains 9 discrete values from 1/9 to 9', () => {
    expect(SAATY_VALUES).toHaveLength(9)
    expect(SAATY_VALUES[0]).toBeCloseTo(1 / 9)
    expect(SAATY_VALUES[4]).toBe(1)
    expect(SAATY_VALUES[8]).toBe(9)
  })
})

describe('mToTfn', () => {
  it('produces (m-1, m, m+1) for middle values', () => {
    expect(mToTfn(3)).toEqual({ l: 2, m: 3, u: 4 })
    expect(mToTfn(5)).toEqual({ l: 4, m: 5, u: 6 })
  })

  it('returns (1, 1, 1) for m=1', () => {
    expect(mToTfn(1)).toEqual({ l: 1, m: 1, u: 1 })
  })

  it('clamps upper bound at 9', () => {
    expect(mToTfn(9)).toEqual({ l: 8, m: 9, u: 9 })
  })

  it('clamps lower bound at 1/9 for fractional m', () => {
    const tfn = mToTfn(1 / 9)
    expect(tfn.l).toBeCloseTo(1 / 9)
    expect(tfn.m).toBeCloseTo(1 / 9)
    expect(tfn.u).toBeCloseTo(1 / 8)
  })

  it('handles 1/3 with fractional spread', () => {
    const tfn = mToTfn(1 / 3)
    expect(tfn.l).toBeCloseTo(1 / 4)
    expect(tfn.m).toBeCloseTo(1 / 3)
    expect(tfn.u).toBeCloseTo(1 / 2)
  })
})

describe('reciprocalTfn', () => {
  it('inverts (2, 3, 4) to (1/4, 1/3, 1/2)', () => {
    const tfn = reciprocalTfn({ l: 2, m: 3, u: 4 })
    expect(tfn.l).toBeCloseTo(1 / 4)
    expect(tfn.m).toBeCloseTo(1 / 3)
    expect(tfn.u).toBeCloseTo(1 / 2)
  })

  it('reciprocal of (1,1,1) is (1,1,1)', () => {
    expect(reciprocalTfn({ l: 1, m: 1, u: 1 })).toEqual({ l: 1, m: 1, u: 1 })
  })

  it('is involutive — reciprocal of reciprocal is original', () => {
    const original = { l: 2, m: 3, u: 4 }
    const round = reciprocalTfn(reciprocalTfn(original))
    expect(round.l).toBeCloseTo(original.l)
    expect(round.m).toBeCloseTo(original.m)
    expect(round.u).toBeCloseTo(original.u)
  })
})

describe('identityMatrix', () => {
  it('produces n×n matrix of (1,1,1) cells', () => {
    const m = identityMatrix(3)
    expect(m).toHaveLength(3)
    expect(m[0]).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(m[i][j]).toEqual({ l: 1, m: 1, u: 1 })
      }
    }
  })
})

describe('formatSaatyValue', () => {
  it('returns integers as plain numbers', () => {
    expect(formatSaatyValue(3)).toBe('3')
    expect(formatSaatyValue(1)).toBe('1')
  })

  it('returns fractions for sub-unit values', () => {
    expect(formatSaatyValue(1 / 3)).toBe('1/3')
    expect(formatSaatyValue(1 / 9)).toBe('1/9')
  })
})
