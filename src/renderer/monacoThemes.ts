import type * as Monaco from 'monaco-editor'
import type { ThemeMode } from '../store/themeStore'

export const MONACO_THEMES: Record<ThemeMode, string> = {
  dark: 'yanxi-dark',
  light: 'yanxi-light',
}

export function registerMonacoThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme('yanxi-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0a0a0a',
      'editor.foreground': '#fafafa',
    },
  })
  monaco.editor.defineTheme('yanxi-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0a0a0a',
    },
  })
}
