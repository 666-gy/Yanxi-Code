import { create } from 'zustand'

interface UiState {
  sidebarCollapsed: boolean
  rightSidebarCollapsed: boolean
  toggleSidebar: () => void
  toggleRightSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setRightSidebarCollapsed: (v: boolean) => void
}
export const useUi = create<UiState>((set) => ({
  sidebarCollapsed: false,
  rightSidebarCollapsed: true, // 右侧边栏默认折叠（设置面板）
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleRightSidebar: () => set(s => ({ rightSidebarCollapsed: !s.rightSidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setRightSidebarCollapsed: (v) => set({ rightSidebarCollapsed: v })
}))
