import { Fragment } from 'react'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  // Render in its own card, split off from the wizard flow — used for a
  // higher-order analytical step that does not continue the mandatory sequence.
  detached?: boolean
}

interface StepperProps {
  steps: StepItem[]
  activeId: StepId
  onSelect: (id: StepId) => void
}

interface NumberedStep {
  step: StepItem
  number: number
}

// Step navigation. The mandatory wizard flow (plus the sensitivity step) sits in
// one card as numbered steps; any `detached` step (profile comparison) sits in
// its own card as a plain button, since it is a higher-order action rather than
// a sequence position. The two cards are split by a vertical divider. State
// lives in the caller (ui-store), so this is a controlled presentational
// component.
export function Stepper({ steps, activeId, onSelect }: StepperProps) {
  const numbered: NumberedStep[] = steps.map((step, index) => ({ step, number: index + 1 }))
  const mainSteps = numbered.filter((n) => !n.step.detached)
  const detachedSteps = numbered.filter((n) => n.step.detached)

  return (
    <nav aria-label="Кроки розрахунку">
      <div className="flex items-stretch gap-3">
        <StepGroup
          label="Основні кроки розрахунку"
          items={mainSteps}
          activeId={activeId}
          onSelect={onSelect}
          // The mandatory flow fills the available width; the detached card keeps
          // its natural size to the right of the divider.
          grow
        />
        {detachedSteps.length > 0 && (
          <>
            <span aria-hidden="true" className="w-px shrink-0 self-stretch bg-border" />
            <div
              role="group"
              aria-label="Окремий аналіз"
              className="flex items-center justify-center gap-2 rounded-lg border bg-card p-3"
            >
              {detachedSteps.map(({ step }) => (
                <Button
                  key={step.id}
                  type="button"
                  size="sm"
                  variant={step.id === activeId ? 'default' : 'outline'}
                  disabled={step.disabled}
                  aria-current={step.id === activeId ? 'step' : undefined}
                  onClick={() => onSelect(step.id)}
                  // Fixed width so toggling the active variant (which adds the
                  // outline's 1px border) does not change the button's size.
                  className="w-48"
                >
                  {step.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

interface StepGroupProps {
  label: string
  items: NumberedStep[]
  activeId: StepId
  onSelect: (id: StepId) => void
  // Grow to fill the remaining row width instead of sizing to content.
  grow?: boolean
}

function StepGroup({ label, items, activeId, onSelect, grow }: StepGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border bg-card p-3',
        grow && 'flex-1',
      )}
    >
      {items.map(({ step, number }, index) => (
        <Fragment key={step.id}>
          {index > 0 && <span aria-hidden="true" className="h-px w-10 shrink-0 bg-border" />}
          <StepButton
            step={step}
            number={number}
            active={step.id === activeId}
            onSelect={onSelect}
          />
        </Fragment>
      ))}
    </div>
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
