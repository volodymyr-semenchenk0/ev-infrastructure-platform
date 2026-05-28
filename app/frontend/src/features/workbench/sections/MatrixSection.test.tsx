import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { beforeEach, describe, expect, it } from 'vitest'

import { api } from '@/lib/api'
import { useProfileStore } from '@/store/profile-store'
import { useSessionStore, type FuzzyNumber } from '@/store/session-store'

import { MatrixSection } from './MatrixSection'

const CRITERIA = [
  { id: 1, code: 'A', name: 'A', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 2, code: 'B', name: 'B', unit: '', optimizationType: 'max', scale: 'r' },
  { id: 3, code: 'C', name: 'C', unit: '', optimizationType: 'max', scale: 'r' },
]

const PROFILE = { id: 1, code: 'municipal', name: 'Муніципалітет' }

// Circular preference A≫B≫C≫A — gives CR ≫ 0.10 for n=3.
const HIGH_CR_3X3: FuzzyNumber[][] = [
  [
    { l: 1, m: 1, u: 1 },
    { l: 7, m: 9, u: 9 },
    { l: 1 / 9, m: 1 / 9, u: 1 / 7 },
  ],
  [
    { l: 1 / 9, m: 1 / 9, u: 1 / 7 },
    { l: 1, m: 1, u: 1 },
    { l: 7, m: 9, u: 9 },
  ],
  [
    { l: 7, m: 9, u: 9 },
    { l: 1 / 9, m: 1 / 9, u: 1 / 7 },
    { l: 1, m: 1, u: 1 },
  ],
]

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MatrixSection />
    </QueryClientProvider>,
  )
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

  it('renders the Saaty scale legend above the editable matrix', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    expect(await screen.findByText('Шкала Сааті')).toBeInTheDocument()
    // λ_max stat card is the consistency block; presence confirms the merged
    // editor (not just the old summary card) is rendered.
    expect(screen.getByText('λ_max')).toBeInTheDocument()
    mock.restore()
  })

  it('disables «Обчислити ваги» when the local matrix has CR > 0.10', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    useSessionStore.getState().commitMatrix(HIGH_CR_3X3, 0)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    const button = await screen.findByRole('button', { name: /Обчислити ваги/ })
    await waitFor(() => expect(button).toBeDisabled())
    mock.restore()
  })

  it('enables «Обчислити ваги» when the default identity matrix is in the editor', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    renderSection()

    const button = await screen.findByRole('button', { name: /Обчислити ваги/ })
    await waitFor(() => expect(button).toBeEnabled())
    mock.restore()
  })

  it('reset (icon-only) returns the matrix to identity, clearing prior edits', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    useSessionStore.getState().commitMatrix(HIGH_CR_3X3, 0)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)

    const user = userEvent.setup()
    renderSection()

    // Wait for the Compute button to be disabled (HIGH_CR_3X3 ⇒ CR > 0.10)
    const compute = await screen.findByRole('button', { name: /Обчислити ваги/ })
    await waitFor(() => expect(compute).toBeDisabled())

    await user.click(screen.getByRole('button', { name: 'Скинути до дефолту' }))
    // After reset to identity, CR = 0 ⇒ Compute is enabled.
    await waitFor(() => expect(compute).toBeEnabled())
    mock.restore()
  })

  it('runs FAHP using the local matrix and writes results to the store', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)

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
    // The local matrix is also committed to session so other consumers can read it.
    expect(useSessionStore.getState().pairwiseMatrix).not.toBeNull()
    mock.restore()
  })

  it('records an error on FAHP failure without overwriting weights', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)

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
