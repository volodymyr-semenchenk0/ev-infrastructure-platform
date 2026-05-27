import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { api } from '@/lib/api'
import { useProfileStore } from '@/store/profile-store'
import { useSessionStore } from '@/store/session-store'

import { ProfileSection } from './ProfileSection'

const PROFILES = [
  { id: 1, code: 'municipal', name: 'Муніципалітет', description: 'Місто' },
  { id: 2, code: 'investor', name: 'Інвестор', description: 'Бізнес' },
]

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

    const user = userEvent.setup()
    renderWithQuery(<ProfileSection />)

    const cards = await screen.findAllByRole('button', { name: 'Обрати' })
    await user.click(cards[0])

    await waitFor(() => {
      expect(useProfileStore.getState().activeProfile?.code).toBe('municipal')
    })
    expect(screen.getByText(/Профіль: Муніципалітет/)).toBeInTheDocument()
    mock.restore()
  })

  it('clears the session when switching to a different profile', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(200, PROFILES)

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

  it('shows an error message when the profile fetch fails', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles').reply(500)

    renderWithQuery(<ProfileSection />)

    expect(
      await screen.findByText(/Не вдалося завантажити список профілів/),
    ).toBeInTheDocument()
    mock.restore()
  })
})
