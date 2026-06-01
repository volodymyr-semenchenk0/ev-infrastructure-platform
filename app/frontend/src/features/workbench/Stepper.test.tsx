import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Stepper, type StepItem } from './Stepper'

function makeSteps(overrides: Partial<Record<string, Partial<StepItem>>> = {}): StepItem[] {
  const base: StepItem[] = [
    { id: 'setup', label: 'Профіль і матриця', complete: false, disabled: false },
    { id: 'weights', label: 'Ваги (FAHP)', complete: false, disabled: true },
    { id: 'ranking', label: 'Ранжування', complete: false, disabled: true },
    {
      id: 'sensitivity',
      label: 'Чутливість (МК)',
      complete: false,
      disabled: true,
    },
    {
      id: 'comparison',
      label: 'Порівняння профілів',
      complete: false,
      disabled: false,
      detached: true,
    },
  ]
  return base.map((s) => ({ ...s, ...overrides[s.id] }))
}

describe('Stepper', () => {
  it('renders step numbers and short labels', () => {
    render(<Stepper steps={makeSteps()} activeId="setup" onSelect={() => {}} />)
    expect(screen.getByText('Профіль і матриця')).toBeInTheDocument()
    expect(screen.getByText('Ваги (FAHP)')).toBeInTheDocument()
    // The first step shows its ordinal number.
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows a check icon instead of the number for a completed step', () => {
    const steps = makeSteps({ setup: { complete: true } })
    const { container } = render(
      <Stepper steps={steps} activeId="weights" onSelect={() => {}} />,
    )
    // Completed setup hides its "1" and renders the lucide check svg instead.
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(container.querySelector('svg.lucide-check')).toBeInTheDocument()
  })

  it('marks the active step with aria-current', () => {
    render(<Stepper steps={makeSteps()} activeId="setup" onSelect={() => {}} />)
    const active = screen.getByRole('button', { name: /Профіль і матриця/ })
    expect(active).toHaveAttribute('aria-current', 'step')
  })

  it('disables steps whose prerequisites are not met and ignores their clicks', async () => {
    const onSelect = vi.fn()
    render(<Stepper steps={makeSteps()} activeId="setup" onSelect={onSelect} />)
    const locked = screen.getByRole('button', { name: /Ранжування/ })
    expect(locked).toBeDisabled()
    await userEvent.click(locked)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('calls onSelect with the step id when an enabled step is clicked', async () => {
    const onSelect = vi.fn()
    const steps = makeSteps({ weights: { disabled: false } })
    render(<Stepper steps={steps} activeId="setup" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /Ваги \(FAHP\)/ }))
    expect(onSelect).toHaveBeenCalledWith('weights')
  })

  it('splits the wizard flow and the detached step into two separate cards', () => {
    render(<Stepper steps={makeSteps()} activeId="setup" onSelect={() => {}} />)

    const mainGroup = screen.getByRole('group', { name: /Основні кроки/ })
    expect(within(mainGroup).getByRole('button', { name: /Профіль і матриця/ })).toBeInTheDocument()
    expect(within(mainGroup).getByRole('button', { name: /Чутливість/ })).toBeInTheDocument()
    // The comparison step is not part of the main card.
    expect(
      within(mainGroup).queryByRole('button', { name: /Порівняння профілів/ }),
    ).not.toBeInTheDocument()

    const analysisGroup = screen.getByRole('group', { name: /Окремий аналіз/ })
    expect(
      within(analysisGroup).getByRole('button', { name: /Порівняння профілів/ }),
    ).toBeInTheDocument()
  })

  it('renders the detached comparison as a plain button without a step number', () => {
    render(<Stepper steps={makeSteps()} activeId="setup" onSelect={() => {}} />)
    const comparison = screen.getByRole('button', { name: /Порівняння профілів/ })
    // It is an action button, not a numbered step — no "5" badge, no check icon.
    expect(within(comparison).queryByText('5')).not.toBeInTheDocument()
    expect(comparison.querySelector('svg.lucide-check')).not.toBeInTheDocument()
  })

  it('activates the comparison panel when its button is clicked', async () => {
    const onSelect = vi.fn()
    render(<Stepper steps={makeSteps()} activeId="setup" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /Порівняння профілів/ }))
    expect(onSelect).toHaveBeenCalledWith('comparison')
  })

  it('splits the two cards with a vertical divider', () => {
    // Connectors inside a card are horizontal (w-10, h-px); the divider between
    // the two cards is the only vertical (w-px) rule.
    const { container } = render(
      <Stepper steps={makeSteps()} activeId="setup" onSelect={() => {}} />,
    )
    expect(container.querySelector('span.w-px')).toBeInTheDocument()
  })

  it('shows a check icon for the sensitivity step once it is complete', () => {
    const steps = makeSteps({ sensitivity: { complete: true, disabled: false } })
    render(<Stepper steps={steps} activeId="sensitivity" onSelect={() => {}} />)
    const sensitivity = screen.getByRole('button', { name: /Чутливість/ })
    // The completed step renders a check svg instead of its ordinal "4".
    expect(within(sensitivity).queryByText('4')).not.toBeInTheDocument()
    expect(sensitivity.querySelector('svg.lucide-check')).toBeInTheDocument()
  })
})
