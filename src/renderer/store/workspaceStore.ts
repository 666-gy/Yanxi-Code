import { create } from 'zustand'
import { api } from '../services/ipc'
import { useEditor } from './editorStore'

interface WorkspaceState {
  root: string | null
  open: () => Promise<void>
  setRoot: (r: string | null) => void
  close: () => void
}
export const useWorkspace = create<WorkspaceState>((set) => ({
  root: null,
  setRoot: (r) => set({ root: r }),
  open: async () => {
    const r = await api.fs.pickWorkspace()
    if (r) set({ root: r })
  },
  close: () => {
    set({ root: null })
    useEditor.getState().closeAll()
  }
}))
