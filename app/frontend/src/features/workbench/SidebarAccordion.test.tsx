import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SidebarAccordion, type AccordionSection } from './SidebarAccordion'
import type { SectionStatus } from './StatusBadge'

function makeSections(): AccordionSection[] {
  return [
    { id: 'a', title: 'Section A', status: 'idle', content: <p>Body A</p> },
    { id: 'b', title: 'Section B', status: 'ready', content: <p>Body B</p> },
    { id: 'c', title: 'Section C', status: 'attention', content: <p>Body C</p> },
  ]
}

function makeWizardSections(
  statuses: [SectionStatus, SectionStatus, SectionStatus],
): AccordionSection[] {
  return [
    { id: 'step1', title: 'Step 1', status: statuses[0], content: <p>Body 1</p> },
    { id: 'step2', title: 'Step 2', status: statuses[1], content: <p>Body 2</p> },
    { id: 'step3', title: 'Step 3', status: statuses[2], content: <p>Body 3</p> },
  ]
}

describe('SidebarAccordion', () => {
  it('renders one trigger per section with the status badge label', () => {
    render(<SidebarAccordion sections={makeSections()} />)
    expect(screen.getByRole('button', { name: /Section A/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Section B/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Section C/ })).toBeInTheDocument()
    expect(screen.getByText('Не задано')).toBeInTheDocument()
    expect(screen.getByText('Готово')).toBeInTheDocument()
    expect(screen.getByText('Потребує уваги')).toBeInTheDocument()
  })

  it('reflects defaultOpenIds via aria-expanded', () => {
    render(<SidebarAccordion sections={makeSections()} defaultOpenIds={['b']} />)
    expect(screen.getByRole('button', { name: /Section A/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /Section B/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Body B')).toBeInTheDocument()
  })

  it('toggles a section open and closed on click', async () => {
    const user = userEvent.setup()
    render(<SidebarAccordion sections={makeSections()} />)
    const trigger = screen.getByRole('button', { name: /Section A/ })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Body A')).toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Body A')).not.toBeInTheDocument()
  })

  it('evicts the oldest open section when the maxOpen cap is exceeded', async () => {
    const user = userEvent.setup()
    render(<SidebarAccordion sections={makeSections()} maxOpen={2} />)
    const triggerA = screen.getByRole('button', { name: /Section A/ })
    const triggerB = screen.getByRole('button', { name: /Section B/ })
    const triggerC = screen.getByRole('button', { name: /Section C/ })

    await user.click(triggerA)
    await user.click(triggerB)
    expect(triggerA).toHaveAttribute('aria-expanded', 'true')
    expect(triggerB).toHaveAttribute('aria-expanded', 'true')

    await user.click(triggerC)
    expect(triggerA).toHaveAttribute('aria-expanded', 'false')
    expect(triggerB).toHaveAttribute('aria-expanded', 'true')
    expect(triggerC).toHaveAttribute('aria-expanded', 'true')
  })

  it('wires aria-controls between trigger and the panel region', () => {
    render(<SidebarAccordion sections={makeSections()} defaultOpenIds={['a']} />)
    const trigger = screen.getByRole('button', { name: /Section A/ })
    const panelId = trigger.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    const panel = document.getElementById(panelId as string)
    expect(panel).not.toBeNull()
    expect(panel).toHaveAttribute('aria-labelledby', trigger.id)
  })

  describe('auto-open next section when current becomes ready', () => {
    it('does not auto-open siblings on initial render even if some sections start ready', () => {
      render(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 1/ })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('button', { name: /Step 3/ })).toHaveAttribute('aria-expanded', 'false')
    })

    it('auto-opens the next section when a section transitions idle -> ready', () => {
      const { rerender } = render(
        <SidebarAccordion
          sections={makeWizardSections(['idle', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'false')

      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'true')
    })

    it('does not auto-open the next section when current transitions to attention', () => {
      const { rerender } = render(
        <SidebarAccordion
          sections={makeWizardSections(['idle', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['attention', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'false')
    })

    it('auto-opens the next section when a section transitions attention -> ready', () => {
      const { rerender } = render(
        <SidebarAccordion
          sections={makeWizardSections(['attention', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'false')

      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'true')
    })

    it('respects maxOpen cap when auto-opening: evicts oldest open section (FIFO)', () => {
      const { rerender } = render(
        <SidebarAccordion
          sections={makeWizardSections(['idle', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
          maxOpen={2}
        />,
      )
      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
          maxOpen={2}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 1/ })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'true')

      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'ready', 'idle'])}
          defaultOpenIds={['step1']}
          maxOpen={2}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 1/ })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('button', { name: /Step 3/ })).toHaveAttribute('aria-expanded', 'true')
    })

    it('opens the last section that transitioned when multiple flip to ready simultaneously', () => {
      // Models the FAHP+TOPSIS round-trip: POST /api/evaluations returns both
      // weights and ranking in one response, so step2 and step3 flip to 'ready'
      // in the same render. We open the LAST transitioned section (step3 = TOPSIS
      // ranking) so the operator sees the most recent computation result.
      const { rerender } = render(
        <SidebarAccordion
          sections={[
            { id: 'step1', title: 'Step 1', status: 'ready', content: <p>Body 1</p> },
            { id: 'step2', title: 'Step 2', status: 'idle', content: <p>Body 2</p> },
            { id: 'step3', title: 'Step 3', status: 'idle', content: <p>Body 3</p> },
            { id: 'step4', title: 'Step 4', status: 'idle', content: <p>Body 4</p> },
          ]}
          defaultOpenIds={['step2']}
          maxOpen={2}
        />,
      )
      rerender(
        <SidebarAccordion
          sections={[
            { id: 'step1', title: 'Step 1', status: 'ready', content: <p>Body 1</p> },
            { id: 'step2', title: 'Step 2', status: 'ready', content: <p>Body 2</p> },
            { id: 'step3', title: 'Step 3', status: 'ready', content: <p>Body 3</p> },
            { id: 'step4', title: 'Step 4', status: 'idle', content: <p>Body 4</p> },
          ]}
          defaultOpenIds={['step2']}
          maxOpen={2}
        />,
      )
      expect(screen.getByRole('button', { name: /Step 3/ })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('button', { name: /Step 4/ })).toHaveAttribute('aria-expanded', 'false')
    })

    it('does nothing when all sections are ready (nothing left to advance to)', () => {
      const { rerender } = render(
        <SidebarAccordion
          sections={makeWizardSections(['idle', 'ready', 'ready'])}
          defaultOpenIds={['step1']}
        />,
      )
      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'ready', 'ready'])}
          defaultOpenIds={['step1']}
        />,
      )
      // step2 and step3 were already ready, so nothing should newly open.
      expect(screen.getByRole('button', { name: /Step 2/ })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('button', { name: /Step 3/ })).toHaveAttribute('aria-expanded', 'false')
    })

    it('does not re-open a section that the user manually closed until the previous step transitions again', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <SidebarAccordion
          sections={makeWizardSections(['idle', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      const trigger2 = screen.getByRole('button', { name: /Step 2/ })
      expect(trigger2).toHaveAttribute('aria-expanded', 'true')

      await user.click(trigger2)
      expect(trigger2).toHaveAttribute('aria-expanded', 'false')

      rerender(
        <SidebarAccordion
          sections={makeWizardSections(['ready', 'idle', 'idle'])}
          defaultOpenIds={['step1']}
        />,
      )
      expect(trigger2).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
