import { create } from 'zustand'

interface UiState {
  sidebarCollapsed: boolean
  settingsOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  toggleSettings: () => void
  setSettingsOpen: (v: boolean) => void
}
export const useUi = create<UiState>((set) => ({
  sidebarCollapsed: false,
  settingsOpen: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSettings: () => set(s => ({ settingsOpen: !s.settingsOpen })),
  setSettingsOpen: (v) => set({ settingsOpen: v })
}))
