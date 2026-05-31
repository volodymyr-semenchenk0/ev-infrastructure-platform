import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSessionStore } from '@/store/session-store'

// WeightsBarChart pulls @nivo/bar which renders SVGs based on DOM measurements
// jsdom can't compute. Stub it so the chart-presence assertion is meaningful
// without spinning up Nivo's full layout.
vi.mock('@/features/results/WeightsBarChart', () => ({
  WeightsBarChart: ({ weights }: { weights: Record<string, number> }) => (
    <div data-testid="weights-chart">
      {Object.keys(weights).length} bars
    </div>
  ),
}))

import { WeightsSection } from './WeightsSection'

const CRITERIA = [
  { id: 1, code: 'A', name: 'Альфа', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 2, code: 'B', name: 'Бета', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 3, code: 'C', name: 'Гамма', unit: '', optimizationType: 'max', scale: 'r' },
]

function renderSection(node: ReactNode = <WeightsSection />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('WeightsSection', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
  })

  it('shows the placeholder when weights are not set', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    expect(
      await screen.findByText(/Обчислення ще не виконано/),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('weights-chart')).not.toBeInTheDocument()
    mock.restore()
  })

  it('renders the chart, sorted table with rank, and CR when weights are present', async () => {
    useSessionStore.getState().setWeights({ B: 0.5, A: 0.3, C: 0.2 }, 0.07)
    useSessionStore.getState().setEvaluationId(7)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    expect(await screen.findByTestId('weights-chart')).toHaveTextContent('3 bars')

    const rows = screen.getAllByRole('row').slice(1) // skip header row
    // Columns are: #, Критерій, Код, w_j — code is the third <td>.
    const codeColumn = rows.map((row) => row.querySelectorAll('td')[2]?.textContent)
    expect(codeColumn).toEqual(['B', 'A', 'C'])

    // CR is rendered in the top metadata row, alongside the evaluationId.
    expect(screen.getByText(/CR:/)).toBeInTheDocument()
    expect(screen.getByText('0.070')).toBeInTheDocument()
    expect(screen.getByText(/ID розрахунку/)).toBeInTheDocument()

    // Inline export buttons (CSV/JSON) come from TabularExportButtons.
    expect(screen.getByRole('button', { name: /^CSV$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^JSON$/ })).toBeInTheDocument()
    // Chart export buttons (PNG/SVG).
    expect(screen.getByRole('button', { name: /PNG/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SVG/ })).toBeInTheDocument()
    mock.restore()
  })
})
