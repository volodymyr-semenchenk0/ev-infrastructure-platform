import { cn } from '@/lib/utils'

interface SpearmanBadgeProps {
  rho: number
}

function bucketStyles(rho: number): string {
  const abs = Math.abs(rho)
  if (abs >= 0.8) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (abs >= 0.5) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

function bucketLabel(rho: number): string {
  const abs = Math.abs(rho)
  if (abs >= 0.8) return 'Висока узгодженість'
  if (abs >= 0.5) return 'Помірна узгодженість'
  return 'Слабка узгодженість'
}

export function SpearmanBadge({ rho }: SpearmanBadgeProps) {
  const formatted = Number.isFinite(rho) ? rho.toFixed(3) : '—'
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border px-6 py-4',
        bucketStyles(rho),
      )}
      role="status"
      aria-label={`Spearman rank correlation ρ = ${formatted}`}
    >
      <div className="text-xs uppercase tracking-wide opacity-80">
        Spearman ρ
      </div>
      <div className="text-3xl font-semibold tabular-nums">{formatted}</div>
      <div className="text-sm opacity-80">{bucketLabel(rho)}</div>
    </div>
  )
}
