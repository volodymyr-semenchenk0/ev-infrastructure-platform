import { describe, it, expect, beforeEach } from 'vitest'
import { useProfileStore } from './profile-store'

describe('useProfileStore', () => {
  beforeEach(() => {
    useProfileStore.getState().setActiveProfile(null)
  })

  it('starts with no active profile', () => {
    expect(useProfileStore.getState().activeProfile).toBeNull()
  })

  it('setActiveProfile updates state', () => {
    const profile = { id: 1, code: 'municipal', name: 'Муніципальний' }
    useProfileStore.getState().setActiveProfile(profile)
    expect(useProfileStore.getState().activeProfile).toEqual(profile)
  })

  it('setActiveProfile(null) clears active profile', () => {
    useProfileStore
      .getState()
      .setActiveProfile({ id: 2, code: 'investor', name: 'Інвестор' })
    useProfileStore.getState().setActiveProfile(null)
    expect(useProfileStore.getState().activeProfile).toBeNull()
  })
})
