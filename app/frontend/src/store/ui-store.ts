import { create } from 'zustand'

// The workbench is a 5-step wizard. Steps 1-3 (setup → weights → ranking) are
// the mandatory connected flow; sensitivity and comparison are detached
// analytical steps, each reachable on its own.
export type StepId = 'setup' | 'weights' | 'ranking' | 'sensitivity' | 'comparison'

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
