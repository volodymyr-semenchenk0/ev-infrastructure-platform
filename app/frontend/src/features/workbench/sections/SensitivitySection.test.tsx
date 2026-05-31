import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSessionStore } from '@/store/session-store'

// Nivo charts render SVGs jsdom cannot lay out. Stub the three storyline charts
// so the section logic (run mutation, store writes, headings, toggle) is tested
// in isolation from the visualisation layer.
vi.mock('@/features/sensitivity/CstarHistogram', () => ({
  CstarHistogram: () => <div data-testid="cstar-histogram" />,
}))
vi.mock('@/features/sensitivity/RankingForestPlot', () => ({
  RankingForestPlot: () => <div data-testid="forest-plot" />,
}))
vi.mock('@/features/sensitivity/ConvergenceChart', () => ({
  ConvergenceChart: () => <div data-testid="convergence-chart" />,
}))

import { SensitivitySection } from './SensitivitySection'

const LOCATIONS = [
  { id: 1, name: 'Alpha', district: 'A', latitude: 50, longitude: 30 },
  { id: 2, name: 'Beta', district: 'B', latitude: 50.1, longitude: 30.1 },
]

function renderSection(node: ReactNode = <SensitivitySection />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('SensitivitySection', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
  })

  it('asks the operator to compute weights first when there is no evaluation', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    renderSection()

    expect(await screen.findByText(/Спочатку обчисліть ваги/)).toBeInTheDocument()
    mock.restore()
  })

  it('runs MC, writes the result to the store, and shows the full analytical view', async () => {
    useSessionStore.getState().setEvaluationId(42)

    const responseBody = {
      stabilityMatrix: {
        '1': { '1': 0.8, '3': 0.95, '5': 1 },
        '2': { '1': 0.2, '3': 0.6, '5': 1 },
      },
      confidenceIntervals: [
        { locationId: 1, mean: 0.82, lower: 0.7, upper: 0.9 },
        { locationId: 2, mean: 0.39, lower: 0.3, upper: 0.5 },
      ],
      rankingIntervals: [
        { locationId: 1, mean: 0.82, lower: 0.7, upper: 0.9 },
        { locationId: 2, mean: 0.39, lower: 0.3, upper: 0.5 },
      ],
      cstarHistogram: {
        edgesByLocation: { '1': [0.7, 0.8, 0.9], '2': [0.3, 0.4, 0.5] },
        countsByLocation: { '1': [40, 60], '2': [70, 30] },
      },
      convergence: {
        iterations: [1, 10, 100],
        meanByLocation: { '1': [0.8, 0.81, 0.82], '2': [0.4, 0.39, 0.39] },
      },
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
    expect(screen.getByTestId('cstar-histogram')).toBeInTheDocument()
    expect(screen.getByTestId('forest-plot')).toBeInTheDocument()
    expect(screen.getByTestId('convergence-chart')).toBeInTheDocument()
    expect(screen.getByText(/Крок 1/)).toBeInTheDocument()
    expect(screen.getByText(/Крок 2/)).toBeInTheDocument()
    expect(screen.getByText(/Крок 3/)).toBeInTheDocument()
    expect(screen.getByText(/Матриця стабільності p_i\(k\) \(таблиця\)/)).toBeInTheDocument()
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
