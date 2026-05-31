import type { ReactNode } from 'react'
import { Info as InfoIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface InfoProps {
  children: ReactNode
  className?: string
}

// Informational callout: a muted panel with a leading icon, distinct from the
// surrounding body text. Used for soft guidance (e.g. "complete a prior step
// first") that should not read as alarming as a warning.
export function Info({ children, className }: InfoProps) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
