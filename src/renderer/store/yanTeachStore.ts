import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TeachScope = 'selection' | 'file'
export type TeachAiStatus = 'idle' | 'thinking' | 'streaming' | 'error'

export interface TeachRecord {
  id: string
  filePath: string
  fileName: string
  startLine: number
  endLine: number
  code: string
  translation: string
  timestamp: number
  scope: TeachScope
  mdPath?: string
  language?: string
}

interface YanTeachState {
  panelOpen: boolean
  records: TeachRecord[]
  streamingText: string
  isTranslating: boolean
  aiStatus: TeachAiStatus
  togglePanel: () => void
  setPanelOpen: (open: boolean) => void
  openPanel: () => void
  addRecord: (record: TeachRecord) => void
  updateRecord: (id: string, patch: Partial<TeachRecord>) => void
  removeRecord: (id: string) => void
  clearRecords: () => void
  setStreamingText: (text: string) => void
  appendStreamingText: (chunk: string) => void
  setIsTranslating: (value: boolean) => void
  setAiStatus: (status: TeachAiStatus) => void
}

export const useYanTeach = create<YanTeachState>()(
  persist(
    (set) => ({
      panelOpen: false,
      records: [],
      streamingText: '',
      isTranslating: false,
      aiStatus: 'idle',
      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
      setPanelOpen: (open) => set({ panelOpen: open }),
      openPanel: () => set({ panelOpen: true }),
      addRecord: (record) => set((s) => ({ records: [record, ...s.records] })),
      updateRecord: (id, patch) => set((s) => ({
        records: s.records.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      removeRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
      clearRecords: () => set({ records: [] }),
      setStreamingText: (text) => set({ streamingText: text }),
      appendStreamingText: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),
      setIsTranslating: (value) => set({ isTranslating: value }),
      setAiStatus: (status) => set({ aiStatus: status })
    }),
    {
      name: 'yanxi-yan-teach',
      partialize: (s) => ({ records: s.records })
    }
  )
)
