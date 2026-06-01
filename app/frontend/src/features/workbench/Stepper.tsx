import { Fragment } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { StepId } from '@/store/ui-store'

export interface StepItem {
  id: StepId
  // Short label shown to the right of the step circle.
  label: string
  // Show a filled check instead of the number once the step's work is done.
  complete: boolean
  // Not yet reachable: prerequisite step incomplete or its data invalid.
  disabled: boolean
}

interface StepperProps {
  steps: StepItem[]
  activeId: StepId
  onSelect: (id: StepId) => void
}

// Step navigation. All steps (1-4) share one centered group with connectors.
// State lives in the caller (ui-store), so this is a controlled presentational
// component.
export function Stepper({ steps, activeId, onSelect }: StepperProps) {
  return (
    <nav aria-label="Кроки розрахунку">
      <div
        role="group"
        aria-label="Кроки розрахунку"
        className="flex items-center justify-center gap-2 rounded-lg border bg-card p-3"
      >
        {steps.map((step, index) => (
          <Fragment key={step.id}>
            {index > 0 && (
              <span aria-hidden="true" className="h-px w-10 shrink-0 bg-border" />
            )}
            <StepButton
              step={step}
              number={index + 1}
              active={step.id === activeId}
              onSelect={onSelect}
            />
          </Fragment>
        ))}
      </div>
    </nav>
  )
}

interface StepButtonProps {
  step: StepItem
  number: number
  active: boolean
  onSelect: (id: StepId) => void
}

function StepButton({ step, number, active, onSelect }: StepButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(step.id)}
      disabled={step.disabled}
      aria-current={active ? 'step' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-md px-2 py-1 text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        step.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors',
          step.complete
            ? 'border-primary bg-primary text-primary-foreground'
            : active
              ? 'border-primary text-primary'
              : 'border-border bg-background text-muted-foreground',
        )}
      >
        {step.complete ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
      </span>
      <span
        className={cn(
          // Keep a constant font-weight across states so the label width — and
          // thus the row layout — does not shift; signal the active step by
          // colour only.
          'whitespace-nowrap text-xs font-medium leading-tight',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {step.label}
      </span>
    </button>
  )
}
