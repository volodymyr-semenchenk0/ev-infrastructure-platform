import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { api } from '@/lib/api'
import { useProfileStore } from '@/store/profile-store'
import { useSessionStore } from '@/store/session-store'

import { MatrixSection } from './MatrixSection'

const CRITERIA = [
  { id: 1, code: 'A', name: 'A', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 2, code: 'B', name: 'B', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 3, code: 'C', name: 'C', unit: '', optimizationType: 'max', scale: 'r' },
]

const PROFILE = { id: 1, code: 'municipal', name: 'Муніципалітет' }

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MatrixSection />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function expectButton(name: RegExp) {
  return screen.getByRole('button', { name })
}

describe('MatrixSection', () => {
  beforeEach(() => {
    useProfileStore.getState().setActiveProfile(null)
    useSessionStore.getState().resetSession()
  })

  it('shows the profile prompt when no profile is selected', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    expect(
      await screen.findByText(/Спочатку оберіть профіль/),
    ).toBeInTheDocument()
    mock.restore()
  })

  it('shows totalPairs = m(m-1)/2 and 0 set pairs when the matrix is empty', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    expect(await screen.findByText(/0/)).toBeInTheDocument()
    // m=3 -> m(m-1)/2 = 3 total pairs
    expect(screen.getByText(/3/)).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    mock.restore()
  })

  it('disables «Обчислити ваги» when CR > 0.10', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    // 2x2 matrix is enough to enable the section logic; CR is forced by the
    // session store so we do not need real consistency math here.
    useSessionStore.getState().commitMatrix(
      [
        [
          { l: 1, m: 1, u: 1 },
          { l: 1, m: 2, u: 3 },
        ],
        [
          { l: 1 / 3, m: 1 / 2, u: 1 },
          { l: 1, m: 1, u: 1 },
        ],
      ],
      0.18,
    )

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    await screen.findByText(/Редагувати матрицю/)
    expect(expectButton(/Обчислити ваги/)).toBeDisabled()
    mock.restore()
  })

  it('enables «Обчислити ваги» when CR is within the threshold', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    useSessionStore.getState().commitMatrix(
      [
        [
          { l: 1, m: 1, u: 1 },
          { l: 1, m: 1, u: 1 },
        ],
        [
          { l: 1, m: 1, u: 1 },
          { l: 1, m: 1, u: 1 },
        ],
      ],
      0.05,
    )

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    await screen.findByText(/Редагувати матрицю/)
    expect(expectButton(/Обчислити ваги/)).toBeEnabled()
    mock.restore()
  })

  it('runs FAHP and writes weights, ranking and evaluationId to the store', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    useSessionStore.getState().commitMatrix(
      [
        [
          { l: 1, m: 1, u: 1 },
          { l: 1, m: 1, u: 1 },
        ],
        [
          { l: 1, m: 1, u: 1 },
          { l: 1, m: 1, u: 1 },
        ],
      ],
      0.04,
    )

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    mock.onPost('/evaluations').reply(200, {
      evaluationId: 42,
      weights: { A: 0.5, B: 0.3, C: 0.2 },
      ranking: [
        { locationId: 1, rank: 1, closeness: 0.9, sPlus: 0.1, sMinus: 0.5 },
      ],
      executionTimeMs: 12,
    })

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: /Обчислити ваги/ }))

    await waitFor(() => {
      expect(useSessionStore.getState().weights).toEqual({ A: 0.5, B: 0.3, C: 0.2 })
    })
    expect(useSessionStore.getState().ranking).toHaveLength(1)
    expect(useSessionStore.getState().evaluationId).toBe(42)
    mock.restore()
  })

  it('records an error on FAHP failure without overwriting weights', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    useSessionStore.getState().commitMatrix(
      [
        [
          { l: 1, m: 1, u: 1 },
          { l: 1, m: 1, u: 1 },
        ],
        [
          { l: 1, m: 1, u: 1 },
          { l: 1, m: 1, u: 1 },
        ],
      ],
      0.04,
    )

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    mock.onPost('/evaluations').reply(500)

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: /Обчислити ваги/ }))

    await waitFor(() => {
      expect(useSessionStore.getState().lastError?.source).toBe('fahp')
    })
    expect(useSessionStore.getState().weights).toBeNull()
    expect(useSessionStore.getState().evaluationId).toBeNull()
    mock.restore()
  })
})
