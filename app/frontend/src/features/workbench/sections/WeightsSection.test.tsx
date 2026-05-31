import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSessionStore, type RankingItem } from '@/store/session-store'

const PENDING_RANKING: RankingItem[] = [
  { locationId: 1, rank: 1, closeness: 0.9, sPlus: 0.1, sMinus: 0.5 },
]

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

  it('renders the chart and the sorted table with rank when weights are present', async () => {
    useSessionStore.getState().setWeights({ B: 0.5, A: 0.3, C: 0.2 }, 0.07)
    useSessionStore.getState().setEvaluationId(7)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    expect(await screen.findByTestId('weights-chart')).toHaveTextContent('3 bars')

    const rows = screen.getAllByRole('row').slice(1) // skip header row
    // Columns are: #, Критерій, Код, l_j, w_j, u_j — code is the third <td>.
    const codeColumn = rows.map((row) => row.querySelectorAll('td')[2]?.textContent)
    expect(codeColumn).toEqual(['B', 'A', 'C'])

    // The weights step no longer surfaces CR or the evaluation id; CR lives on
    // the matrix step instead.
    expect(screen.queryByText(/CR:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ID розрахунку/)).not.toBeInTheDocument()

    // Inline export buttons (CSV/JSON) come from TabularExportButtons.
    expect(screen.getByRole('button', { name: /^CSV$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^JSON$/ })).toBeInTheDocument()
    // Chart export buttons (PNG/SVG).
    expect(screen.getByRole('button', { name: /PNG/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SVG/ })).toBeInTheDocument()
    mock.restore()
  })

  it('renders l_j and u_j columns from the fuzzy bounds, dash when absent', async () => {
    useSessionStore.getState().setWeights({ A: 0.5, B: 0.3, C: 0.2 }, 0.07, {
      A: { l: 0.4, m: 0.5, u: 0.6 },
      B: { l: 0.2, m: 0.3, u: 0.4 },
      // C intentionally omitted to exercise the dash fallback.
    })

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    await screen.findByTestId('weights-chart')

    const rows = screen.getAllByRole('row').slice(1) // skip header
    // Columns: #, Критерій, Код, l_j, w_j, u_j → l is td[3], u is td[5].
    // Rows are sorted by weight desc: A (0.5), B (0.3), C (0.2).
    const cells = (i: number) => rows[i].querySelectorAll('td')
    expect(cells(0)[3]?.textContent).toBe('0.4000')
    expect(cells(0)[5]?.textContent).toBe('0.6000')
    expect(cells(2)[3]?.textContent).toBe('–')
    expect(cells(2)[5]?.textContent).toBe('–')
    mock.restore()
  })

  it('reveals the held ranking when «Виконати ранжування» is clicked', async () => {
    useSessionStore.getState().setWeights({ A: 0.5, B: 0.3, C: 0.2 }, 0.07)
    useSessionStore.getState().setEvaluationId(7)
    useSessionStore.getState().setPendingRanking(PENDING_RANKING)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    const user = userEvent.setup()
    renderSection()

    const runButton = await screen.findByRole('button', { name: /Виконати ранжування/ })
    expect(useSessionStore.getState().ranking).toBeNull()

    await user.click(runButton)

    await waitFor(() => {
      expect(useSessionStore.getState().ranking).toEqual(PENDING_RANKING)
    })
    // Once revealed, the action collapses to a confirmation note.
    expect(
      screen.queryByRole('button', { name: /Виконати ранжування/ }),
    ).not.toBeInTheDocument()
    mock.restore()
  })

  it('disables «Виконати ранжування» until a ranking is held', async () => {
    useSessionStore.getState().setWeights({ A: 0.5, B: 0.3, C: 0.2 }, 0.07)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    const runButton = await screen.findByRole('button', { name: /Виконати ранжування/ })
    expect(runButton).toBeDisabled()
    mock.restore()
  })
})
