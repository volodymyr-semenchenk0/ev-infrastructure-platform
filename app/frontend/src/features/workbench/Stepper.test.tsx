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
      optional: true,
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

  it('renders the optional step in a separate container from the mandatory group', () => {
    render(<Stepper steps={makeSteps()} activeId="setup" onSelect={() => {}} />)
    const mandatory = screen.getByRole('group', { name: /Обовʼязков/ })
    const analytical = screen.getByRole('group', { name: /Аналітичн/ })
    expect(within(mandatory).getByRole('button', { name: /Профіль і матриця/ })).toBeInTheDocument()
    expect(within(analytical).getByRole('button', { name: /Чутливість/ })).toBeInTheDocument()
    // The optional step is not inside the mandatory group.
    expect(within(mandatory).queryByRole('button', { name: /Чутливість/ })).toBeNull()
  })
})
