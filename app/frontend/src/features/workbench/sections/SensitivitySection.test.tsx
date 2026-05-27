import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { api } from '@/lib/api'
import { useSessionStore } from '@/store/session-store'

import { SensitivitySection } from './SensitivitySection'

const LOCATIONS = [
  { id: 1, name: 'Alpha', district: 'A', latitude: 50, longitude: 30 },
  { id: 2, name: 'Beta', district: 'B', latitude: 50.1, longitude: 30.1 },
]

function renderSection(node: ReactNode = <SensitivitySection />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SensitivitySection', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
  })

  it('asks the operator to compute weights first when there is no evaluation', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    renderSection()

    expect(
      await screen.findByText(/Спочатку обчисліть ваги/),
    ).toBeInTheDocument()
    mock.restore()
  })

  it('runs MC, writes the result to the store, and shows summaries', async () => {
    useSessionStore.getState().setEvaluationId(42)

    const responseBody = {
      stabilityMatrix: {
        '1': { '1': 0.8, '3': 0.95, '5': 1 },
        '2': { '1': 0.2, '3': 0.6, '5': 1 },
      },
      confidenceIntervals: [
        { locationId: 1, lower: 0.7, upper: 0.9 },
        { locationId: 2, lower: 0.3, upper: 0.5 },
      ],
    }

    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)
    mock.onPost('/evaluations/42/sensitivity').reply(200, responseBody)

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: /Запустити/ }))

    await waitFor(() => {
      expect(useSessionStore.getState().sensitivity).not.toBeNull()
    })
    expect(screen.getByText(/95 % ДІ для топ-2/)).toBeInTheDocument()
    expect(screen.getByText(/p_i\(k\)/)).toBeInTheDocument()
    expect(screen.getByText(/Шар стійкості на карті/)).toBeInTheDocument()
    mock.restore()
  })

  it('toggles the stability layer flag', async () => {
    useSessionStore.getState().setEvaluationId(42)
    useSessionStore.getState().setSensitivity({
      stabilityMatrix: { '1': { '1': 0.8, '3': 1, '5': 1 } },
      confidenceIntervals: [{ locationId: 1, lower: 0.7, upper: 0.9 }],
    })

    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    const user = userEvent.setup()
    renderSection()

    const toggle = await screen.findByRole('switch', { name: /Шар стійкості/ })
    expect(toggle).not.toBeChecked()
    await user.click(toggle)
    await waitFor(() => {
      expect(useSessionStore.getState().stabilityLayerEnabled).toBe(true)
    })
    mock.restore()
  })

  it('records an error on MC failure', async () => {
    useSessionStore.getState().setEvaluationId(42)
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)
    mock.onPost('/evaluations/42/sensitivity').reply(500)

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: /Запустити/ }))

    await waitFor(() => {
      expect(useSessionStore.getState().lastError?.source).toBe('sensitivity')
    })
    expect(useSessionStore.getState().sensitivity).toBeNull()
    mock.restore()
  })
})
