export const MARKER_COLORS = {
  top: '#10b981',
  mid: '#facc15',
  bottom: '#ef4444',
  neutral: '#94a3b8',
} as const

export type MarkerColor = (typeof MARKER_COLORS)[keyof typeof MARKER_COLORS]

export function colorByRank(rank: number | null, total: number): MarkerColor {
  if (rank == null || total <= 0) return MARKER_COLORS.neutral
  const quartile = Math.ceil(total / 4)
  if (rank <= quartile) return MARKER_COLORS.top
  if (rank > total - quartile) return MARKER_COLORS.bottom
  return MARKER_COLORS.mid
}

// Stability shading for UI_PLAN §5.2.5 «Шар стійкості»: deeper green for
// alternatives that land in top-1 more often. Returns a CSS hex colour
// interpolated between MARKER_COLORS.neutral (p = 0) and MARKER_COLORS.top
// (p = 1). Inputs outside [0, 1] are clamped.
const NEUTRAL_RGB = [148, 163, 184] as const // #94a3b8
const TOP_RGB = [16, 185, 129] as const // #10b981

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function toHexComponent(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}

export function colorByStability(probability: number | null): string {
  if (probability === null) return MARKER_COLORS.neutral
  const p = clamp01(probability)
  const r = NEUTRAL_RGB[0] + (TOP_RGB[0] - NEUTRAL_RGB[0]) * p
  const g = NEUTRAL_RGB[1] + (TOP_RGB[1] - NEUTRAL_RGB[1]) * p
  const b = NEUTRAL_RGB[2] + (TOP_RGB[2] - NEUTRAL_RGB[2]) * p
  return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`
}
