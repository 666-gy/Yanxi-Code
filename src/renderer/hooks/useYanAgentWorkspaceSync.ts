import { useEffect } from 'react'
import { api } from '../services/ipc'
import { useEditor } from '../store/editorStore'
import { samePath } from '../store/pathShim'
import { useToast } from '../store/toastStore'
import { useWorkspace } from '../store/workspaceStore'

export function useYanAgentWorkspaceSync() {
  const setRoot = useWorkspace(s => s.setRoot)
  const push = useToast(s => s.push)

  useEffect(() => {
    const applyWorkspace = (value: string) => {
      const workspace = String(value || '').trim()
      if (!workspace) return
      const current = useWorkspace.getState().root
      if (current && samePath(current, workspace)) {
        api.fs.acknowledgeAgentWorkspace(workspace)
        return
      }
      if (useEditor.getState().isDirty()) {
        push('Yan Agent 请求切换工作区，但当前有未保存的修改', 'warn')
        api.fs.acknowledgeAgentWorkspace(workspace)
        return
      }
      useEditor.getState().closeAll()
      setRoot(workspace)
      push('已从 Yan Agent 同步工作区', 'info')
      api.fs.acknowledgeAgentWorkspace(workspace)
    }

    const unsubscribe = api.fs.onAgentWorkspace(applyWorkspace)
    void api.fs.consumeAgentWorkspace().then(applyWorkspace)
    return unsubscribe
  }, [setRoot, push])
}
