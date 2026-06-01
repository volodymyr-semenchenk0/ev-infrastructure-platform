import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSessionStore } from '@/store/session-store'

// Nivo's grouped bar chart renders an SVG jsdom cannot lay out. Stub it so the
// section logic (button-driven query, badge, table) is tested in isolation.
vi.mock('@/features/comparison/GroupedBarChart', () => ({
  GroupedBarChart: () => <div data-testid="grouped-bar-chart" />,
}))

import { ComparisonSection } from './ComparisonSection'

const LOCATIONS = [
  { id: 1, name: 'Alpha', district: 'A', latitude: 50, longitude: 30 },
  { id: 2, name: 'Beta', district: 'B', latitude: 50.1, longitude: 30.1 },
]

const COMPARISON_PAYLOAD = {
  profileA: {
    id: 1,
    code: 'municipal',
    name: 'Муніципалітет',
    ranking: [{ locationId: 1, rank: 1, closeness: 0.8, sPlus: 0.1, sMinus: 0.4 }],
  },
  profileB: {
    id: 2,
    code: 'investor',
    name: 'Інвестор',
    ranking: [{ locationId: 1, rank: 2, closeness: 0.6, sPlus: 0.2, sMinus: 0.3 }],
  },
  comparison: {
    spearmanRho: 0.87,
    pairwiseDifferences: [
      { locationId: 1, rankA: 1, rankB: 2, delta: -1 },
      { locationId: 2, rankA: 2, rankB: 1, delta: 1 },
    ],
  },
}

function renderSection(node: ReactNode = <ComparisonSection />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('ComparisonSection', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
  })

  it('shows the run button and no result before the comparison is triggered', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    renderSection()

    expect(await screen.findByRole('button', { name: /Порівняти профілі/ })).toBeInTheDocument()
    expect(screen.queryByText(/Spearman/)).not.toBeInTheDocument()
    mock.restore()
  })

  it('runs the comparison and renders the badge, chart and difference table', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)
    mock.onGet('/profiles/comparison').reply(200, COMPARISON_PAYLOAD)

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: /Порівняти профілі/ }))

    expect(await screen.findByText('0.870')).toBeInTheDocument()
    expect(screen.getByTestId('grouped-bar-chart')).toBeInTheDocument()
    expect(screen.getByText('Різниці рангів')).toBeInTheDocument()
    expect(screen.getByText('Муніципалітет')).toBeInTheDocument()
    mock.restore()
  })

  it('records an error on comparison failure', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)
    mock.onGet('/profiles/comparison').reply(500)

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: /Порівняти профілі/ }))

    await waitFor(() => {
      expect(useSessionStore.getState().lastError?.source).toBe('comparison')
    })
    mock.restore()
  })
})
