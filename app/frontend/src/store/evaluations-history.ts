import { create } from 'zustand'
import { persist, type StateStorage, createJSONStorage } from 'zustand/middleware'

export interface HistoryItem {
  id: number
  profileName: string
  profileCode: string
  createdAt: string
}

const LIMIT = 5

interface State {
  recent: HistoryItem[]
  pushEvaluation: (item: HistoryItem) => void
  clear: () => void
}

const memoryStore = new Map<string, string>()

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name)
      }
    } catch {
      /* ignore */
    }
    return memoryStore.get(name) ?? null
  },
  setItem: (name, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value)
        return
      }
    } catch {
      /* ignore */
    }
    memoryStore.set(name, value)
  },
  removeItem: (name) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name)
        return
      }
    } catch {
      /* ignore */
    }
    memoryStore.delete(name)
  },
}

export const useEvaluationsHistory = create<State>()(
  persist(
    (set) => ({
      recent: [],
      pushEvaluation: (item) =>
        set((state) => {
          const filtered = state.recent.filter((r) => r.id !== item.id)
          return { recent: [item, ...filtered].slice(0, LIMIT) }
        }),
      clear: () => set({ recent: [] }),
    }),
    {
      name: 'ev-history',
      storage: createJSONStorage(() => safeStorage),
    },
  ),
)
