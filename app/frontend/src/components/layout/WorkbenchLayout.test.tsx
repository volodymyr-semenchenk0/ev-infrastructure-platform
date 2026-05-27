import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { WorkbenchLayout } from './WorkbenchLayout'

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<WorkbenchLayout />}>
          <Route index element={<div data-testid="content">Workbench</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('WorkbenchLayout a11y', () => {
  it('renders a skip link that targets the main landmark', () => {
    renderLayout()
    const link = screen.getByRole('link', { name: 'Перейти до основного вмісту' })
    expect(link).toHaveAttribute('href', '#workbench-main')
  })

  it('exposes the main content as a labelled landmark', () => {
    renderLayout()
    const main = screen.getByRole('main', { name: 'Робоча область' })
    expect(main).toHaveAttribute('id', 'workbench-main')
  })

  it('mounts the routed page inside the main landmark', () => {
    renderLayout()
    const main = screen.getByRole('main', { name: 'Робоча область' })
    expect(main).toContainElement(screen.getByTestId('content'))
  })
})
