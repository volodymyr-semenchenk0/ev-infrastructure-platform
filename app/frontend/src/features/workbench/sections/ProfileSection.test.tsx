import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { api } from '@/lib/api'
import { useProfileStore } from '@/store/profile-store'
import { useSessionStore, type FuzzyNumber } from '@/store/session-store'

import { ProfileSection } from './ProfileSection'

const PROFILES = [
  { id: 1, code: 'municipal', name: 'Муніципалітет', description: 'Місто' },
  { id: 2, code: 'investor', name: 'Інвестор', description: 'Бізнес' },
]

function sampleMatrix(diag: number, off: { l: number; m: number; u: number }): FuzzyNumber[][] {
  const n = 3
  const matrix: FuzzyNumber[][] = []
  for (let i = 0; i < n; i += 1) {
    const row: FuzzyNumber[] = []
    for (let j = 0; j < n; j += 1) {
      if (i === j) {
        row.push({ l: diag, m: diag, u: diag })
      } else {
        row.push({ ...off })
      }
    }
    matrix.push(row)
  }
  return matrix
}

function renderWithQuery(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('ProfileSection', () => {
  beforeEach(() => {
    useProfileStore.getState().setActiveProfile(null)
    useSessionStore.getState().resetSession()
  })

  it('renders both profile cards when nothing is selected', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(200, PROFILES)

    renderWithQuery(<ProfileSection />)

    expect(await screen.findByText('Муніципалітет')).toBeInTheDocument()
    expect(screen.getByText('Інвестор')).toBeInTheDocument()
    mock.restore()
  })

  it('writes the chosen profile to the profile store and collapses to a status row', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(200, PROFILES)
    mock.onGet('/profiles/1').reply(200, {
      id: 1,
      code: 'municipal',
      name: 'Муніципалітет',
      pairwiseMatrix: sampleMatrix(1, { l: 2, m: 3, u: 4 }),
    })

    const user = userEvent.setup()
    renderWithQuery(<ProfileSection />)

    const cards = await screen.findAllByRole('button', { name: 'Обрати' })
    await user.click(cards[0])

    await waitFor(() => {
      expect(useProfileStore.getState().activeProfile?.code).toBe('municipal')
    })
    expect(screen.getByText(/Обраний профіль: Муніципалітет/)).toBeInTheDocument()
    mock.restore()
  })

  it('clears the session when switching to a different profile', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(200, PROFILES)
    mock.onGet('/profiles/2').reply(200, {
      id: 2,
      code: 'investor',
      name: 'Інвестор',
      pairwiseMatrix: sampleMatrix(1, { l: 1, m: 1, u: 1 }),
    })

    // Seed an existing session for an earlier profile choice.
    useProfileStore.getState().setActiveProfile(PROFILES[0])
    useSessionStore.getState().setEvaluationId(7)

    const user = userEvent.setup()
    renderWithQuery(<ProfileSection />)

    await user.click(await screen.findByRole('button', { name: 'Змінити' }))
    const investorCard = await screen.findByText('Інвестор')
    const investorSelect = investorCard
      .closest('div')!
      .parentElement!.parentElement!.querySelector('button')!
    await user.click(investorSelect)

    await waitFor(() => {
      expect(useProfileStore.getState().activeProfile?.code).toBe('investor')
    })
    expect(useSessionStore.getState().evaluationId).toBeNull()
    mock.restore()
  })

  it('auto-loads the default Ã matrix into the session store when a profile is picked', async () => {
    const matrix = sampleMatrix(1, { l: 4, m: 5, u: 6 })
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(200, PROFILES)
    mock.onGet('/profiles/1').reply(200, {
      id: 1,
      code: 'municipal',
      name: 'Муніципалітет',
      pairwiseMatrix: matrix,
    })

    const user = userEvent.setup()
    renderWithQuery(<ProfileSection />)

    const cards = await screen.findAllByRole('button', { name: 'Обрати' })
    await user.click(cards[0])

    await waitFor(() => {
      expect(useSessionStore.getState().pairwiseMatrix).not.toBeNull()
    })
    const stored = useSessionStore.getState().pairwiseMatrix!
    expect(stored).toHaveLength(3)
    expect(stored[0][1]).toEqual({ l: 4, m: 5, u: 6 })
    mock.restore()
  })

  it('falls back to identity matrix when the auto-load 404s', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(200, PROFILES)
    mock.onGet('/profiles/1').reply(404, { detail: 'Not found' })

    const user = userEvent.setup()
    renderWithQuery(<ProfileSection />)

    const cards = await screen.findAllByRole('button', { name: 'Обрати' })
    await user.click(cards[0])

    await waitFor(() => {
      expect(useSessionStore.getState().pairwiseMatrix).not.toBeNull()
    })
    // Identity fallback: every cell is (1, 1, 1).
    for (const row of useSessionStore.getState().pairwiseMatrix!) {
      for (const cell of row) {
        expect(cell).toEqual({ l: 1, m: 1, u: 1 })
      }
    }
    expect(useSessionStore.getState().consistencyRatio).toBe(0)
    mock.restore()
  })

  it('shows an error message when the profile fetch fails', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(500)

    renderWithQuery(<ProfileSection />)

    expect(await screen.findByText(/Не вдалося завантажити список профілів/)).toBeInTheDocument()
    mock.restore()
  })
})
