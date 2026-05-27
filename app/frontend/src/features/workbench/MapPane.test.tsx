import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

// react-map-gl pulls maplibre-gl, which expects a canvas/WebGL stack jsdom
// does not provide. We stub it so the empty/loading/error overlays can be
// asserted without spinning up a real map.
vi.mock('@/features/map/LocationMap', () => ({
  LocationMap: ({ locations }: { locations: { id: number; name: string }[] }) => (
    <div data-testid="location-map">
      Map with {locations.length} locations
    </div>
  ),
}))

import { MapPane } from './MapPane'

function renderWithQuery(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('MapPane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the loading overlay while locations or criteria are fetching', () => {
    const mock = new MockAdapter(api, { delayResponse: 50 })
    mock.onGet('/locations').reply(200, [])
    mock.onGet('/criteria').reply(200, [])

    renderWithQuery(<MapPane />)

    expect(screen.getByRole('status')).toHaveTextContent(/Завантаження локацій/)
    mock.restore()
  })

  it('shows the empty-state overlay when there are no locations', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, [])
    mock.onGet('/criteria').reply(200, [
      { id: 1, code: 'Pop_dens', name: 'Population', unit: '', optimizationType: 'max', scale: 'r' },
    ])

    renderWithQuery(<MapPane />)

    expect(await screen.findByText('Локації не завантажено')).toBeInTheDocument()
    expect(screen.queryByTestId('location-map')).not.toBeInTheDocument()
    mock.restore()
  })

  it('renders the map once locations and criteria load', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(200, [
      { id: 1, name: 'Loc A', district: 'A', latitude: 50.5, longitude: 30.5 },
      { id: 2, name: 'Loc B', district: 'B', latitude: 50.6, longitude: 30.6 },
    ])
    mock.onGet('/criteria').reply(200, [
      { id: 1, code: 'Pop_dens', name: 'Population', unit: '', optimizationType: 'max', scale: 'r' },
    ])

    renderWithQuery(<MapPane />)

    expect(await screen.findByTestId('location-map')).toHaveTextContent('2 locations')
    mock.restore()
  })

  it('shows the error overlay when the API returns 500', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(500)
    mock.onGet('/criteria').reply(200, [])

    renderWithQuery(<MapPane />)

    expect(await screen.findByText(/Не вдалося завантажити карту/)).toBeInTheDocument()
    mock.restore()
  })
})
