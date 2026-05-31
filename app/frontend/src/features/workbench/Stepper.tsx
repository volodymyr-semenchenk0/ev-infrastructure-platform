import { Fragment } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { StepId } from '@/store/ui-store'

export interface StepItem {
  id: StepId
  // Short label under the step number.
  label: string
  // Show a filled check instead of the number once the step's work is done.
  complete: boolean
  // Not yet reachable: prerequisite step incomplete or its data invalid.
  disabled: boolean
  // The detached optional step (sensitivity). Rendered after a divider so it
  // reads as separate from the mandatory 1-3 group.
  optional?: boolean
}

interface StepperProps {
  steps: StepItem[]
  activeId: StepId
  onSelect: (id: StepId) => void
}

// Horizontal step navigation. Steps before an `optional` step are joined by a
// connector line into one mandatory group; the optional step sits past a
// divider with its own marker. State lives in the caller (ui-store), so this
// is a controlled presentational component.
export function Stepper({ steps, activeId, onSelect }: StepperProps) {
  return (
    <nav aria-label="Кроки розрахунку">
      <ol className="flex items-start gap-1 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isActive = step.id === activeId
          // The visual step number ignores the optional gap — the optional
          // step still counts as the next ordinal for the operator.
          const number = index + 1
          const showDivider = step.optional && index > 0
          return (
            <Fragment key={step.id}>
              {showDivider && (
                <li
                  aria-hidden="true"
                  className="flex shrink-0 flex-col items-center self-stretch px-1"
                >
                  <span className="mt-3 h-8 w-px bg-border" />
                </li>
              )}
              <li className="flex min-w-0 flex-1 items-start">
                {/* Connector into this step from the previous one, except for
                    the first step and any step that starts a new group. */}
                {index > 0 && !showDivider && (
                  <span
                    aria-hidden="true"
                    className="mt-4 h-px flex-1 bg-border"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  disabled={step.disabled}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'group flex shrink-0 flex-col items-center gap-1 rounded-md px-2 py-1 text-center',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    step.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors',
                      step.complete
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {step.complete ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      number
                    )}
                  </span>
                  <span
                    className={cn(
                      'max-w-[8rem] text-xs leading-tight',
                      isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
