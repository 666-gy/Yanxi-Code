import { useEffect } from 'react'
import { api } from '../services/ipc'
import { useWorkspace } from '../store/workspaceStore'
import { useFileTree } from '../store/fileTreeStore'
import { useEditor } from '../store/editorStore'
import { useToast } from '../store/toastStore'

export function useWorkspaceWatcher() {
  const root = useWorkspace(s => s.root)
  const loadRoot = useFileTree(s => s.loadRoot)
  const applyWatchEvent = useFileTree(s => s.applyWatchEvent)
  const reloadFromDisk = useEditor(s => s.reloadFromDisk)
  const push = useToast(s => s.push)

  useEffect(() => {
    if (!root) { useFileTree.setState({ root: null }); return }
    loadRoot(root)
    const off = api.fs.onWatchEvent(async (e) => {
      applyWatchEvent(e)
      if (e.type === 'change') {
        const status = await reloadFromDisk(e.path)
        if (status === 'conflict') {
          push(`“${e.path.split('\\').pop()}” 在磁盘上已修改，但你有未保存的更改`, 'warn')
        }
      }
    })
    return () => { off(); api.fs.unwatch() }
  }, [root, loadRoot, applyWatchEvent, reloadFromDisk, push])
}
