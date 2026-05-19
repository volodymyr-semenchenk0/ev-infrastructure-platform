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
