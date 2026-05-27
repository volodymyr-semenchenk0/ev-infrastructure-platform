import { describe, expect, it } from 'vitest'

import { MARKER_COLORS, colorByStability } from './marker-color'

describe('colorByStability', () => {
  it('returns the neutral colour when probability is null', () => {
    expect(colorByStability(null)).toBe(MARKER_COLORS.neutral)
  })

  it('returns the neutral colour at p = 0 and the top colour at p = 1', () => {
    expect(colorByStability(0).toLowerCase()).toBe(MARKER_COLORS.neutral)
    expect(colorByStability(1).toLowerCase()).toBe(MARKER_COLORS.top)
  })

  it('clamps inputs outside [0, 1]', () => {
    expect(colorByStability(-0.5).toLowerCase()).toBe(MARKER_COLORS.neutral)
    expect(colorByStability(1.5).toLowerCase()).toBe(MARKER_COLORS.top)
  })

  it('returns intermediate hex colours for mid-range probabilities', () => {
    const mid = colorByStability(0.5)
    expect(mid).toMatch(/^#[0-9a-f]{6}$/i)
    expect(mid.toLowerCase()).not.toBe(MARKER_COLORS.neutral)
    expect(mid.toLowerCase()).not.toBe(MARKER_COLORS.top)
  })

  it('treats NaN as 0', () => {
    expect(colorByStability(Number.NaN).toLowerCase()).toBe(MARKER_COLORS.neutral)
  })
})
