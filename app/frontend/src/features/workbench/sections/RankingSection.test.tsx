import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

// The map embed needs a real WebGL stack we cannot give it in jsdom. Stub it so
// the surrounding section can be asserted independently.
vi.mock('@/features/workbench/RankingMapEmbed', () => ({
  RankingMapEmbed: () => <div data-testid="ranking-map-embed" />,
}))

import { RankingSection } from './RankingSection'

const LOCATIONS = [
  { id: 1, name: 'Alpha', district: 'A', latitude: 50, longitude: 30 },
  { id: 2, name: 'Beta', district: 'B', latitude: 50.1, longitude: 30.1 },
  { id: 3, name: 'Gamma', district: 'C', latitude: 50.2, longitude: 30.2 },
]

function renderSection(node: ReactNode = <RankingSection />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('RankingSection', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
    useUiStore.getState().setActiveStep('ranking')
  })

  it('shows the placeholder when no ranking is set', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    renderSection()

    expect(await screen.findByText(/Ранжування ще не виконано/)).toBeInTheDocument()
    mock.restore()
  })

  it('renders the table, the always-on map and inline export buttons', async () => {
    useSessionStore.getState().setRanking([
      { locationId: 2, rank: 1, closeness: 0.91, sPlus: 0.1, sMinus: 0.5 },
      { locationId: 1, rank: 2, closeness: 0.72, sPlus: 0.2, sMinus: 0.4 },
      { locationId: 3, rank: 3, closeness: 0.51, sPlus: 0.3, sMinus: 0.3 },
    ])

    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    renderSection()

    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    // Map is always rendered above the table (no toggle).
    expect(screen.getByTestId('ranking-map-embed')).toBeInTheDocument()
    expect(screen.queryByTestId('closeness-scatter')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^CSV$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^JSON$/ })).toBeInTheDocument()
    mock.restore()
  })

  it('writes the clicked location id to the session store', async () => {
    useSessionStore.getState().setRanking([
      { locationId: 2, rank: 1, closeness: 0.91, sPlus: 0.1, sMinus: 0.5 },
      { locationId: 1, rank: 2, closeness: 0.72, sPlus: 0.2, sMinus: 0.4 },
    ])

    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    const user = userEvent.setup()
    renderSection()

    const betaRow = (await screen.findByText('Beta')).closest('tr')!
    await user.click(within(betaRow).getByText('Beta'))

    await waitFor(() => {
      expect(useSessionStore.getState().selectedLocationId).toBe(2)
    })

    // Second click toggles selection back off.
    await user.click(within(betaRow).getByText('Beta'))
    await waitFor(() => {
      expect(useSessionStore.getState().selectedLocationId).toBeNull()
    })
    mock.restore()
  })

  it('navigates to the sensitivity step on the «Перевірити чутливість» button', async () => {
    useSessionStore.getState().setRanking([
      { locationId: 1, rank: 1, closeness: 0.5, sPlus: 0.2, sMinus: 0.2 },
    ])

    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, LOCATIONS)

    const user = userEvent.setup()
    renderSection()

    await screen.findByText('Alpha')
    expect(useUiStore.getState().activeStep).toBe('ranking')

    await user.click(screen.getByRole('button', { name: /Перевірити чутливість/ }))
    await waitFor(() => expect(useUiStore.getState().activeStep).toBe('sensitivity'))
    mock.restore()
  })
})
