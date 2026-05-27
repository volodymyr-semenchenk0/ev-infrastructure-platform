import { cn } from '@/lib/utils'

export type SectionStatus = 'idle' | 'ready' | 'attention'

const LABELS: Record<SectionStatus, string> = {
  idle: 'Не задано',
  ready: 'Готово',
  attention: 'Потребує уваги',
}

// Status palette uses Tailwind tokens to stay aligned with the theme and
// keep WCAG AA contrast on both light and dark backgrounds. The colours
// match UI_PLAN §5.2 (matrix indicator) for consistency across the app.
const STYLES: Record<SectionStatus, string> = {
  idle: 'bg-muted text-muted-foreground',
  ready: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  attention: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
}

interface StatusBadgeProps {
  status: SectionStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  )
}
