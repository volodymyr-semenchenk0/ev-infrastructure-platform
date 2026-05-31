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

// Stand-in for the server-built profile default Ã. Rank-1 (m_ij = w_i/w_j for
// w = [0.5, 0.3, 0.2]) so it is perfectly consistent (CR = 0) yet not identity
// — distinguishing "profile default loaded" from "reset to identity".
const PROFILE_DEFAULT_3X3: FuzzyNumber[][] = [
  [
    { l: 1, m: 1, u: 1 },
    { l: 5 / 3, m: 5 / 3, u: 5 / 3 },
    { l: 5 / 2, m: 5 / 2, u: 5 / 2 },
  ],
  [
    { l: 3 / 5, m: 3 / 5, u: 3 / 5 },
    { l: 1, m: 1, u: 1 },
    { l: 3 / 2, m: 3 / 2, u: 3 / 2 },
  ],
  [
    { l: 2 / 5, m: 2 / 5, u: 2 / 5 },
    { l: 2 / 3, m: 2 / 3, u: 2 / 3 },
    { l: 1, m: 1, u: 1 },
  ],
]

// GET /api/profiles/{id} body the loader reads `pairwiseMatrix` from.
const profileDetail = (pairwiseMatrix: FuzzyNumber[][]) => ({
  id: PROFILE.id,
  code: PROFILE.code,
  name: PROFILE.name,
  criteria: [],
  pairwiseMatrix,
})

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
      await screen.findByText(/Оберіть профіль ОПР для переходу/),
    ).toBeInTheDocument()
    mock.restore()
  })

  it('renders the Saaty scale legend above the editable matrix', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    mock.onGet('/profiles/1').reply(200, profileDetail(PROFILE_DEFAULT_3X3))

    renderSection()

    expect(await screen.findByText('Шкала Сааті')).toBeInTheDocument()
    // λ_max stat card is the consistency block; presence confirms the merged
    // editor (not just the old summary card) is rendered.
    expect(screen.getByText('λ_max')).toBeInTheDocument()
    // Each consistency stat carries an info trigger with an explanatory tooltip.
    expect(screen.getByRole('button', { name: 'Що таке λ_max' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Що таке CR' })).toBeInTheDocument()
    mock.restore()
  })

  it('disables «Обчислити ваги» when the local matrix has CR > 0.10', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    useSessionStore.getState().commitMatrix(HIGH_CR_3X3, 0)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    // Pre-seeded matrix means the section does not self-load; mocked defensively.
    mock.onGet('/profiles/1').reply(200, profileDetail(PROFILE_DEFAULT_3X3))

    renderSection()

    const button = await screen.findByRole('button', { name: /Обчислити ваги/ })
    await waitFor(() => expect(button).toBeDisabled())
    mock.restore()
  })

  it('loads the profile default into the editor and enables compute', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    mock.onGet('/profiles/1').reply(200, profileDetail(PROFILE_DEFAULT_3X3))

    renderSection()

    const button = await screen.findByRole('button', { name: /Обчислити ваги/ })
    await waitFor(() => expect(button).toBeEnabled())
    // The self-load committed the profile default (CR = 0), not an identity matrix.
    await waitFor(() => {
      expect(useSessionStore.getState().pairwiseMatrix?.[0][1].m).toBeCloseTo(5 / 3)
    })
    mock.restore()
  })

  it('reset restores the profile default matrix', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)
    // Start from an edited, inconsistent matrix so compute is disabled.
    useSessionStore.getState().commitMatrix(HIGH_CR_3X3, 0)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    mock.onGet('/profiles/1').reply(200, profileDetail(PROFILE_DEFAULT_3X3))

    const user = userEvent.setup()
    renderSection()

    // HIGH_CR_3X3 ⇒ CR > 0.10 ⇒ Compute disabled.
    const compute = await screen.findByRole('button', { name: /Обчислити ваги/ })
    await waitFor(() => expect(compute).toBeDisabled())

    await user.click(screen.getByRole('button', { name: 'Скинути до дефолту' }))

    // Reset reloads the server default (CR = 0) ⇒ Compute enabled, and the
    // store holds the profile default, not an identity matrix.
    await waitFor(() => expect(compute).toBeEnabled())
    await waitFor(() => {
      expect(useSessionStore.getState().pairwiseMatrix?.[0][1].m).toBeCloseTo(5 / 3)
    })
    mock.restore()
  })

  it('runs FAHP using the local matrix and holds the ranking in the store', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    mock.onGet('/profiles/1').reply(200, profileDetail(PROFILE_DEFAULT_3X3))
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
    // The ranking is held back (revealed only by «Виконати ранжування»), so the
    // ranking step stays empty while weights and the evaluation id are written.
    expect(useSessionStore.getState().ranking).toBeNull()
    expect(useSessionStore.getState().pendingRanking).toHaveLength(1)
    expect(useSessionStore.getState().evaluationId).toBe(42)
    // The local matrix is also committed to session so other consumers can read it.
    expect(useSessionStore.getState().pairwiseMatrix).not.toBeNull()
    mock.restore()
  })

  it('records an error on FAHP failure without overwriting weights', async () => {
    useProfileStore.getState().setActiveProfile(PROFILE)

    const mock = new MockAdapter(api)
    mock.onGet('/criteria').reply(200, CRITERIA)
    mock.onGet('/profiles/1').reply(200, profileDetail(PROFILE_DEFAULT_3X3))
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
