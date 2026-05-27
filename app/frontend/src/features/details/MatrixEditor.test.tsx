import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { api } from '@/lib/api'
import { useSessionStore } from '@/store/session-store'

import { MatrixEditor } from './MatrixEditor'

const CRITERIA = [
  { id: 1, code: 'A', name: 'A', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 2, code: 'B', name: 'B', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 3, code: 'C', name: 'C', unit: '', optimizationType: 'max', scale: 'r' },
]

function renderEditor(node: ReactNode = <MatrixEditor />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/details']}>
        <Routes>
          <Route path="/details" element={node} />
          <Route path="/" element={<div data-testid="workbench" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MatrixEditor', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
  })

  it('renders the consistency stats and Saaty legend', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderEditor()

    expect(await screen.findByLabelText('Статистика узгодженості')).toBeInTheDocument()
    expect(screen.getByText('λ_max')).toBeInTheDocument()
    expect(screen.getByText(/RI \(n=3\)/)).toBeInTheDocument()
    expect(screen.getByText('Шкала Сааті')).toBeInTheDocument()
    mock.restore()
  })

  it('seeds the matrix from the session store when present', async () => {
    useSessionStore.getState().setPairwiseMatrix([
      [
        { l: 1, m: 1, u: 1 },
        { l: 2, m: 3, u: 4 },
        { l: 1, m: 1, u: 1 },
      ],
      [
        { l: 1 / 4, m: 1 / 3, u: 1 / 2 },
        { l: 1, m: 1, u: 1 },
        { l: 1, m: 1, u: 1 },
      ],
      [
        { l: 1, m: 1, u: 1 },
        { l: 1, m: 1, u: 1 },
        { l: 1, m: 1, u: 1 },
      ],
    ])
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderEditor()

    const cell = await screen.findByTestId('cell-0-1')
    expect(within(cell).getByText('3')).toBeInTheDocument()
    mock.restore()
  })

  it('commits the matrix and the CR on save, then navigates to the workbench', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    const user = userEvent.setup()
    renderEditor()

    await screen.findByRole('button', { name: /Зберегти/ })
    await user.click(screen.getByRole('button', { name: /Зберегти/ }))

    await waitFor(() => {
      expect(useSessionStore.getState().pairwiseMatrix).not.toBeNull()
    })
    expect(useSessionStore.getState().consistencyRatio).toBe(0)
    expect(screen.getByTestId('workbench')).toBeInTheDocument()
    mock.restore()
  })

  it('resets to identity when the user clicks the reset button', async () => {
    useSessionStore.getState().setPairwiseMatrix([
      [
        { l: 1, m: 1, u: 1 },
        { l: 2, m: 3, u: 4 },
        { l: 1, m: 1, u: 1 },
      ],
      [
        { l: 1 / 4, m: 1 / 3, u: 1 / 2 },
        { l: 1, m: 1, u: 1 },
        { l: 1, m: 1, u: 1 },
      ],
      [
        { l: 1, m: 1, u: 1 },
        { l: 1, m: 1, u: 1 },
        { l: 1, m: 1, u: 1 },
      ],
    ])
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    const user = userEvent.setup()
    renderEditor()

    const cell = await screen.findByTestId('cell-0-1')
    expect(within(cell).getByText('3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Скинути/ }))

    await waitFor(() => {
      const reset = screen.getByTestId('cell-0-1')
      expect(within(reset).getByText('1')).toBeInTheDocument()
    })
    mock.restore()
  })
})
