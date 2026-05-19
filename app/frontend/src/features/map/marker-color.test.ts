import { describe, it, expect } from 'vitest'
import { colorByRank, MARKER_COLORS } from './marker-color'

describe('colorByRank', () => {
  it('returns neutral colour for null rank (no evaluation)', () => {
    expect(colorByRank(null, 12)).toBe(MARKER_COLORS.neutral)
  })

  it('top quartile ranks (1..3 out of 12) get emerald', () => {
    expect(colorByRank(1, 12)).toBe(MARKER_COLORS.top)
    expect(colorByRank(2, 12)).toBe(MARKER_COLORS.top)
    expect(colorByRank(3, 12)).toBe(MARKER_COLORS.top)
  })

  it('middle ranks (4..9 out of 12) get yellow', () => {
    for (let r = 4; r <= 9; r++) {
      expect(colorByRank(r, 12)).toBe(MARKER_COLORS.mid)
    }
  })

  it('bottom quartile ranks (10..12 out of 12) get red', () => {
    expect(colorByRank(10, 12)).toBe(MARKER_COLORS.bottom)
    expect(colorByRank(11, 12)).toBe(MARKER_COLORS.bottom)
    expect(colorByRank(12, 12)).toBe(MARKER_COLORS.bottom)
  })

  it('returns neutral for invalid total', () => {
    expect(colorByRank(1, 0)).toBe(MARKER_COLORS.neutral)
  })

  it('handles small total (4 locations: 1 top, 2-3 mid, 4 bottom)', () => {
    expect(colorByRank(1, 4)).toBe(MARKER_COLORS.top)
    expect(colorByRank(2, 4)).toBe(MARKER_COLORS.mid)
    expect(colorByRank(3, 4)).toBe(MARKER_COLORS.mid)
    expect(colorByRank(4, 4)).toBe(MARKER_COLORS.bottom)
  })
})
