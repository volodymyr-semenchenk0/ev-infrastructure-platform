import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { StepId } from '@/store/ui-store'

export interface StepItem {
  id: StepId
  // Short label shown below the step circle.
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
                  // min-w instead of fixed w-48 so the button can shrink on narrow screens.
                  className="min-w-[100px]"
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
        'flex items-stretch rounded-lg border bg-card p-3 min-[1366px]:items-center',
        grow && 'flex-1',
      )}
    >
      {items.map(({ step, number }, index) => (
        <StepButton
          key={step.id}
          step={step}
          number={number}
          active={step.id === activeId}
          onSelect={onSelect}
          isFirst={index === 0}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  )
}

interface StepButtonProps {
  step: StepItem
  number: number
  active: boolean
  onSelect: (id: StepId) => void
  isFirst: boolean
  isLast: boolean
}

function StepButton({ step, number, active, onSelect, isFirst, isLast }: StepButtonProps) {
  return (
    // Outer wrapper: not a button — a layout column so the label sits below the circle.
    <div className="flex min-w-0 flex-1 flex-col items-center">
      {/* Row: left connector | circle button | right connector */}
      <div className="flex w-full items-center">
        <span aria-hidden="true" className={cn('h-px flex-1 bg-border', isFirst && 'invisible')} />
        <button
          type="button"
          onClick={() => onSelect(step.id)}
          disabled={step.disabled}
          aria-current={active ? 'step' : undefined}
          aria-label={step.label}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            step.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            step.complete
              ? 'border-primary bg-primary text-primary-foreground'
              : active
                ? 'border-primary text-primary'
                : 'border-border bg-background text-muted-foreground',
          )}
        >
          {step.complete ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
        </button>
        <span aria-hidden="true" className={cn('h-px flex-1 bg-border', isLast && 'invisible')} />
      </div>
      {/* Label below the circle */}
      <span
        className={cn(
          // Constant font-weight across states so the label width does not shift;
          // signal the active step by colour only.
          'mt-1 text-center text-xs font-medium leading-tight',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {step.label}
      </span>
    </div>
  )
}
