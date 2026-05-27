import { create } from 'zustand'

export type AppRole = 'admin' | 'opr'

interface RoleState {
  role: AppRole
  setRole: (role: AppRole) => void
}

export const useRoleStore = create<RoleState>((set) => ({
  role: 'opr',
  setRole: (role) => set({ role }),
}))
