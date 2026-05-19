import { create } from 'zustand'

export interface Profile {
  id: number
  code: string
  name: string
  description?: string | null
}

interface ProfileState {
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile | null) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile }),
}))
