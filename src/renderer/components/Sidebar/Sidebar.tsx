import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useFileTree } from '../../store/fileTreeStore'
import { useWorkspace } from '../../store/workspaceStore'
import { api } from '../../services/ipc'
import { useToast } from '../../store/toastStore'
import { FileTree } from './FileTree'
import { ContextMenu, type CtxState } from './ContextMenu'
import './Sidebar.css'

export function Sidebar() {
  const root = useFileTree(s => s.root)
  const loadRoot = useFileTree(s => s.loadRoot)
  const wsRoot = useWorkspace(s => s.root)
  const push = useToast(s => s.push)
  const [ctx, setCtx] = useState<CtxState | null>(null)
  const [width, setWidth] = useState(260)
  const dragging = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) setWidth(Math.min(560, Math.max(180, e.clientX))) }
    const onUp = () => { dragging.current = false; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const onContext = (e: React.MouseEvent, node: any) => setCtx({ x: e.clientX, y: e.clientY, targetPath: node.path, isDirTarget: node.isDir })

  const newEntry = async (parent: string, isDir: boolean) => {
    const name = window.prompt(isDir ? '文件夹名称' : '文件名称', isDir ? 'new-folder' : 'new-file.ts')
    if (!name) return
    const p = parent + '\\' + name
    await api.fs.createEntry(p, isDir); await loadRoot(wsRoot!); push(`已创建 ${name}`, 'info')
  }
  const del = async (path: string) => {
    if (!window.confirm(`确定删除 ${path.split('\\').pop()}？此操作不可撤销。`)) return
    await api.fs.deleteEntry(path); await loadRoot(wsRoot!); push('已删除', 'info')
  }

  return (
    <>
      <aside className="sidebar" style={{ width }}>
        <div className="sidebar__head">
          <span>资源管理器</span>
          <button className="sidebar__head-btn" title="新建文件" onClick={() => wsRoot && newEntry(wsRoot, false)}>＋</button>
        </div>
        <div className="sidebar__tree" onContextMenu={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, targetPath: wsRoot!, isDirTarget: true }) } }}>
          {root ? <FileTree nodes={root.children} depth={0} onContext={onContext} /> : <div className="ft-empty">未打开工作区</div>}
        </div>
      </aside>
      <div className="sidebar__resizer" onMouseDown={() => { dragging.current = true; document.body.style.cursor = 'col-resize' }} />
      <ContextMenu state={ctx} onClose={() => setCtx(null)} actions={{ newFile: (p) => newEntry(p, false), newFolder: (p) => newEntry(p, true), del }} />
    </>
  )
}
