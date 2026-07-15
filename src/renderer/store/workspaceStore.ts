import { create } from 'zustand'
import { api } from '../services/ipc'

interface WorkspaceState {
  root: string | null
  open: () => Promise<void>
  setRoot: (r: string | null) => void
}
export const useWorkspace = create<WorkspaceState>((set) => ({
  root: null,
  setRoot: (r) => set({ root: r }),
  open: async () => {
    const r = await api.fs.pickWorkspace()
    if (r) set({ root: r })
  }
}))
