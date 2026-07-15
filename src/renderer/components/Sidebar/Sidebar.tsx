import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { PanelLeftClose, FilePlus, FolderPlus, X } from 'lucide-react'
import { useFileTree } from '../../store/fileTreeStore'
import { useWorkspace } from '../../store/workspaceStore'
import { useUi } from '../../store/uiStore'
import { api } from '../../services/ipc'
import { useToast } from '../../store/toastStore'
import { FileTree } from './FileTree'
import { ContextMenu, type CtxState } from './ContextMenu'
import { PromptDialog } from '../common/PromptDialog'
import { ConfirmDialog } from '../common/ConfirmDialog'
import './Sidebar.css'

interface PromptState { parent: string; isDir: boolean }
interface ConfirmState { path: string; name: string }

export function Sidebar() {
  const root = useFileTree(s => s.root)
  const loadRoot = useFileTree(s => s.loadRoot)
  const wsRoot = useWorkspace(s => s.root)
  const closeWs = useWorkspace(s => s.close)
  const collapse = useUi(s => s.toggleSidebar)
  const push = useToast(s => s.push)
  const [ctx, setCtx] = useState<CtxState | null>(null)
  const [width, setWidth] = useState(260)
  const [promptState, setPromptState] = useState<PromptState | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) setWidth(Math.min(560, Math.max(180, e.clientX))) }
    const onUp = () => { dragging.current = false; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // 监听 Ctrl+N 新建文件事件（由 useGlobalShortcuts 派发）
  useEffect(() => {
    const onNewFile = () => { if (wsRoot) setPromptState({ parent: wsRoot, isDir: false }) }
    const onNewFolder = () => { if (wsRoot) setPromptState({ parent: wsRoot, isDir: true }) }
    window.addEventListener('yanxi:new-file', onNewFile)
    window.addEventListener('yanxi:new-folder', onNewFolder)
    return () => {
      window.removeEventListener('yanxi:new-file', onNewFile)
      window.removeEventListener('yanxi:new-folder', onNewFolder)
    }
  }, [wsRoot])

  const onContext = (e: React.MouseEvent, node: any) => setCtx({ x: e.clientX, y: e.clientY, targetPath: node.path, isDirTarget: node.isDir })

  const doCreate = async (name: string) => {
    if (!promptState || !wsRoot) return
    const p = promptState.parent + '\\' + name
    try {
      await api.fs.createEntry(p, promptState.isDir)
      await loadRoot(wsRoot)
      push(`已创建 ${name}`, 'info')
    } catch (err: any) {
      push(`创建失败: ${err.message}`, 'error')
    }
    setPromptState(null)
  }

  const doDelete = async () => {
    if (!confirmState || !wsRoot) return
    try {
      await api.fs.deleteEntry(confirmState.path)
      await loadRoot(wsRoot)
      push('已删除', 'info')
    } catch (err: any) {
      push(`删除失败: ${err.message}`, 'error')
    }
    setConfirmState(null)
  }

  const onCloseWs = () => {
    if (!wsRoot) return
    closeWs()
    push('已关闭工作区', 'info')
  }

  return (
    <>
      <aside className="sidebar" style={{ width }}>
        <div className="sidebar__head">
          <span className="sidebar__head-title">资源管理器</span>
          <div className="sidebar__head-actions">
            <button className="sidebar__head-btn" title="新建文件 (Ctrl+N)" onClick={() => wsRoot && setPromptState({ parent: wsRoot, isDir: false })}><FilePlus size={14} /></button>
            <button className="sidebar__head-btn" title="新建文件夹 (Ctrl+Shift+N)" onClick={() => wsRoot && setPromptState({ parent: wsRoot, isDir: true })}><FolderPlus size={14} /></button>
            {wsRoot && <button className="sidebar__head-btn" title="关闭工作区" onClick={onCloseWs}><X size={14} /></button>}
            <button className="sidebar__head-btn" title="折叠侧边栏" onClick={collapse}><PanelLeftClose size={14} /></button>
          </div>
        </div>
        <div className="sidebar__tree" onContextMenu={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, targetPath: wsRoot!, isDirTarget: true }) } }}>
          {root ? <FileTree nodes={root.children} depth={0} onContext={onContext} /> : <div className="ft-empty">未打开工作区</div>}
        </div>
      </aside>
      <div
        className="sidebar__resizer"
        onMouseDown={() => { dragging.current = true; document.body.style.cursor = 'col-resize' }}
      />
      <ContextMenu
        state={ctx}
        onClose={() => setCtx(null)}
        actions={{
          newFile: (p) => setPromptState({ parent: p, isDir: false }),
          newFolder: (p) => setPromptState({ parent: p, isDir: true }),
          del: (p) => setConfirmState({ path: p, name: p.split('\\').pop() ?? p })
        }}
      />
      <PromptDialog
        open={!!promptState}
        title={promptState?.isDir ? '新建文件夹' : '新建文件'}
        label={promptState?.isDir ? '输入文件夹名称' : '输入文件名称（可含扩展名）'}
        defaultValue={promptState?.isDir ? 'new-folder' : 'new-file.ts'}
        onCancel={() => setPromptState(null)}
        onConfirm={doCreate}
      />
      <ConfirmDialog
        open={!!confirmState}
        title="确认删除"
        message={`确定删除 “${confirmState?.name}”？此操作不可撤销。`}
        onCancel={() => setConfirmState(null)}
        onConfirm={doDelete}
      />
    </>
  )
}
