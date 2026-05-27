import { create } from 'zustand'

interface UiState {
  sidebarOpenIds: string[]
  setSidebarOpenIds: (ids: string[]) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpenIds: ['profile'],
  setSidebarOpenIds: (ids) => set({ sidebarOpenIds: ids }),
}))
