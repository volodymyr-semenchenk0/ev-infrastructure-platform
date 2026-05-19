import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface ConsistencyBadgeProps {
  cr: number
}

const CR_THRESHOLD = 0.1

export function ConsistencyBadge({ cr }: ConsistencyBadgeProps) {
  const ok = cr <= CR_THRESHOLD
  const Icon = ok ? CheckCircle2 : AlertTriangle
  return (
    <Badge
      variant={ok ? 'success' : 'destructive'}
      className="gap-1.5 px-3 py-1 text-sm"
    >
      <Icon className="h-3.5 w-3.5" />
      CR = {cr.toFixed(3)}{' '}
      {ok ? '— матриця консистентна' : '— матриця неконсистентна, CR > 0.10'}
    </Badge>
  )
}
