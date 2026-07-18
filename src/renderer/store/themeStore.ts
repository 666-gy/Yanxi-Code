import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light'

interface ThemeState {
  mode: ThemeMode
  toggle: () => void
  setMode: (mode: ThemeMode) => void
}

export function applyThemeMode(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      toggle: () => {
        const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark'
        applyThemeMode(next)
        set({ mode: next })
      },
      setMode: (mode) => {
        applyThemeMode(mode)
        set({ mode })
      },
    }),
    {
      name: 'yanxi-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeMode(state.mode)
      },
    },
  ),
)

// 首屏渲染前应用默认/持久化主题，避免闪烁
applyThemeMode(
  (() => {
    try {
      const raw = localStorage.getItem('yanxi-theme')
      if (!raw) return 'dark'
      const parsed = JSON.parse(raw) as { state?: { mode?: ThemeMode } }
      return parsed.state?.mode === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })(),
)
