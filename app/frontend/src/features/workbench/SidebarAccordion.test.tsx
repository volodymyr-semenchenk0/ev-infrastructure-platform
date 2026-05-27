import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SidebarAccordion, type AccordionSection } from './SidebarAccordion'

function makeSections(): AccordionSection[] {
  return [
    { id: 'a', title: 'Section A', status: 'idle', content: <p>Body A</p> },
    { id: 'b', title: 'Section B', status: 'ready', content: <p>Body B</p> },
    { id: 'c', title: 'Section C', status: 'attention', content: <p>Body C</p> },
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
})
