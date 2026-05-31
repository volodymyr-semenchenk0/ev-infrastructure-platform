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
  // The detached step (sensitivity). Rendered in its own container beside the
  // mandatory group so it reads as separate from the 1-3 flow.
  optional?: boolean
}

interface StepperProps {
  steps: StepItem[]
  activeId: StepId
  onSelect: (id: StepId) => void
}

// Step navigation. The mandatory steps (1-3) share one centered group that
// spans most of the width; a divider separates the optional step, which fills
// the remaining space. State lives in the caller (ui-store), so this is a
// controlled presentational component.
export function Stepper({ steps, activeId, onSelect }: StepperProps) {
  const mandatory = steps.filter((s) => !s.optional)
  const optional = steps.filter((s) => s.optional)
  // Ordinal across the full sequence (setup=1 … sensitivity=4), independent of
  // which group a step is rendered in.
  const numberOf = (id: StepId) => steps.findIndex((s) => s.id === id) + 1

  return (
    <nav aria-label="Кроки розрахунку">
      <div className="flex items-stretch gap-3 py-1">
        <div
          role="group"
          aria-label="Обовʼязкові кроки"
          className="flex w-4/5 items-center justify-center gap-2 rounded-lg border bg-card p-3"
        >
          {mandatory.map((step, index) => (
            <Fragment key={step.id}>
              {index > 0 && (
                <span aria-hidden="true" className="h-px w-10 shrink-0 bg-border" />
              )}
              <StepButton
                step={step}
                number={numberOf(step.id)}
                active={step.id === activeId}
                onSelect={onSelect}
              />
            </Fragment>
          ))}
        </div>

        {optional.length > 0 && (
          <span aria-hidden="true" className="w-px self-stretch bg-border" />
        )}

        {optional.map((step) => (
          <div
            key={step.id}
            role="group"
            aria-label="Аналітичний крок"
            className="flex flex-1 items-center justify-center rounded-lg border bg-card p-3"
          >
            <StepButton
              step={step}
              number={numberOf(step.id)}
              active={step.id === activeId}
              onSelect={onSelect}
            />
          </div>
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
          'whitespace-nowrap text-xs leading-tight',
          active ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {step.label}
      </span>
    </button>
  )
}
