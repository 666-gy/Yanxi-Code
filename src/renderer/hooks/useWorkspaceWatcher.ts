import { useEffect } from 'react'
import { api } from '../services/ipc'
import { useWorkspace } from '../store/workspaceStore'
import { useFileTree } from '../store/fileTreeStore'
import { useEditor } from '../store/editorStore'

export function useWorkspaceWatcher() {
  const root = useWorkspace(s => s.root)
  const loadRoot = useFileTree(s => s.loadRoot)
  const applyWatchEvent = useFileTree(s => s.applyWatchEvent)
  const reloadFromDisk = useEditor(s => s.reloadFromDisk)

  useEffect(() => {
    if (!root) { useFileTree.setState({ root: null }); return }
    loadRoot(root)
    const off = api.fs.onWatchEvent((e) => {
      applyWatchEvent(e)
      if (e.type === 'change') reloadFromDisk(e.path)
    })
    return () => { off(); api.fs.unwatch() }
  }, [root, loadRoot, applyWatchEvent, reloadFromDisk])
}
