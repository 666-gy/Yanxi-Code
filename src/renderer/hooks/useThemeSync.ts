import { useEffect } from 'react'
import { applyThemeMode, useTheme } from '../store/themeStore'

/** 保证 zustand 持久化恢复后 document 上的 data-theme 与 store 一致。 */
export function useThemeSync() {
  const mode = useTheme(s => s.mode)
  useEffect(() => {
    applyThemeMode(mode)
  }, [mode])
}
