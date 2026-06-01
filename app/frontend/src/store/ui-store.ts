import { create } from 'zustand'

// The workbench is a 4-step wizard. Steps 1-3 (setup → weights → ranking)
// are the mandatory connected flow; sensitivity is a detached optional step.
export type StepId = 'setup' | 'weights' | 'ranking' | 'sensitivity'

interface UiState {
  activeStep: StepId
  setActiveStep: (id: StepId) => void
  mapFullscreen: boolean
  setMapFullscreen: (fullscreen: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeStep: 'setup',
  setActiveStep: (id) => set({ activeStep: id }),
  mapFullscreen: false,
  setMapFullscreen: (fullscreen) => set({ mapFullscreen: fullscreen }),
}))
