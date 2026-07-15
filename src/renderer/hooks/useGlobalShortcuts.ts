import { useEffect } from 'react'
import { useEditor } from '../store/editorStore'
import { useWorkspace } from '../store/workspaceStore'

export function useGlobalShortcuts() {
  const saveActive = useEditor(s => s.saveActive)
  const open = useWorkspace(s => s.open)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const key = e.key.toLowerCase()
      if (key === 's') { e.preventDefault(); saveActive(); return }
      if (key === 'n') {
        e.preventDefault()
        if (e.shiftKey) {
          // Ctrl+Shift+N = 新建文件夹
          if (useWorkspace.getState().root) window.dispatchEvent(new CustomEvent('yanxi:new-folder'))
        } else {
          // Ctrl+N = 新建文件（有工作区时）或打开工作区选择器（无工作区时）
          if (useWorkspace.getState().root) window.dispatchEvent(new CustomEvent('yanxi:new-file'))
          else open()
        }
        return
      }
      if (key === 'o') { e.preventDefault(); open(); return }
      if (key === 'w') {
        e.preventDefault()
        const ap = useEditor.getState().activePath
        if (ap) useEditor.getState().closeTab(ap)
        return
      }
      // Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+A 由 Monaco 在编辑器聚焦时原生处理，这里不拦截
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [saveActive, open])
}
