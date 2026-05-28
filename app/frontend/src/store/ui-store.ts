import { create } from 'zustand'

interface UiState {
  openAccordionIds: string[]
  setOpenAccordionIds: (ids: string[]) => void
  mapVisible: boolean
  setMapVisible: (visible: boolean) => void
  mapFullscreen: boolean
  setMapFullscreen: (fullscreen: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  openAccordionIds: ['profile'],
  setOpenAccordionIds: (ids) => set({ openAccordionIds: ids }),
  mapVisible: false,
  setMapVisible: (visible) => set({ mapVisible: visible }),
  mapFullscreen: false,
  setMapFullscreen: (fullscreen) => set({ mapFullscreen: fullscreen }),
}))
