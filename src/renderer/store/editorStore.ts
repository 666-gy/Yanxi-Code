import { create } from 'zustand'
import { api } from '../services/ipc'
import { isBinaryPath } from '../../shared/constants'

export interface Tab { path: string; name: string; content: string; savedContent: string; binary: boolean; dirty: boolean }

interface EditorState {
  tabs: Tab[]
  activePath: string | null
  openFile: (path: string) => Promise<{ blocked: boolean }>
  closeTab: (path: string) => void
  setContent: (path: string, content: string) => void
  saveActive: () => Promise<void>
  setActive: (path: string) => void
  reloadFromDisk: (path: string) => Promise<'reloaded' | 'conflict' | 'skipped'>
  isDirty: () => boolean
  closeAll: () => void
}
export const useEditor = create<EditorState>((set, get) => ({
  tabs: [], activePath: null,

  openFile: async (path) => {
    const existing = get().tabs.find(t => t.path === path)
    if (existing) { set({ activePath: path }); return { blocked: existing.binary } }
    if (isBinaryPath(path)) {
      const name = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop()!
      set(s => ({ tabs: [...s.tabs, { path, name, content: '', savedContent: '', binary: true, dirty: false }] }))
      set({ activePath: path })
      return { blocked: true }
    }
    const { content } = await api.fs.readFile(path)
    const name = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop()!
    set(s => ({ tabs: [...s.tabs, { path, name, content, savedContent: content, binary: false, dirty: false }], activePath: path }))
    return { blocked: false }
  },

  closeTab: (path) => set(s => {
    const idx = s.tabs.findIndex(t => t.path === path)
    const tabs = s.tabs.filter(t => t.path !== path)
    let activePath = s.activePath
    if (s.activePath === path) activePath = tabs[idx]?.path ?? tabs[idx - 1]?.path ?? null
    return { tabs, activePath }
  }),

  setContent: (path, content) => set(s => ({
    tabs: s.tabs.map(t => t.path === path ? { ...t, content, dirty: t.savedContent !== content } : t)
  })),

  saveActive: async () => {
    const { activePath, tabs } = get(); if (!activePath) return
    const t = tabs.find(x => x.path === activePath); if (!t || t.binary) return
    await api.fs.writeFile(activePath, t.content)
    set({ tabs: tabs.map(x => x.path === activePath ? { ...x, savedContent: x.content, dirty: false } : x) })
  },

  setActive: (path) => set({ activePath: path }),

  reloadFromDisk: async (path) => {
    const t = get().tabs.find(x => x.path === path)
    if (!t || t.binary) return 'skipped'
    if (t.dirty) return 'conflict'
    const { content } = await api.fs.readFile(path)
    set(s => ({ tabs: s.tabs.map(x => x.path === path ? { ...x, content, savedContent: content, dirty: false } : x) }))
    return 'reloaded'
  },

  isDirty: () => get().tabs.some(t => t.dirty),

  closeAll: () => set({ tabs: [], activePath: null })
}))
