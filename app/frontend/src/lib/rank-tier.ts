export type RankTier = 'top' | 'mid' | 'bottom'

// Quartile-based relative position in the ranking. Shared by the map markers
// (saturated pin colors) and the results table (light row tints) so both encode
// the same tier for a given rank, even though they render it differently.
// Returns null when the rank is unknown.
export function rankTier(rank: number | null, total: number): RankTier | null {
  if (rank == null || total <= 0) return null
  const quartile = Math.ceil(total / 4)
  if (rank <= quartile) return 'top'
  if (rank > total - quartile) return 'bottom'
  return 'mid'
}
