import { rankTier } from '@/lib/rank-tier'

export const MARKER_COLORS = {
  top: '#10b981',
  mid: '#facc15',
  bottom: '#ef4444',
  neutral: '#94a3b8',
} as const

export type MarkerColor = (typeof MARKER_COLORS)[keyof typeof MARKER_COLORS]

export function colorByRank(rank: number | null, total: number): MarkerColor {
  switch (rankTier(rank, total)) {
    case 'top':
      return MARKER_COLORS.top
    case 'mid':
      return MARKER_COLORS.mid
    case 'bottom':
      return MARKER_COLORS.bottom
    default:
      return MARKER_COLORS.neutral
  }
}
