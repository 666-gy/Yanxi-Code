import type React from 'react'
import { FilePlus, FolderPlus, Trash2 } from 'lucide-react'
import './Sidebar.css'
export interface CtxState { x: number; y: number; targetPath: string | null; isDirTarget: boolean }
export function ContextMenu({ state, onClose, actions }: {
  state: CtxState | null; onClose: () => void
  actions: { newFile: (parent: string) => void; newFolder: (parent: string) => void; del: (path: string) => void }
}) {
  if (!state) return null
  const parent = state.isDirTarget ? state.targetPath! : state.targetPath!.replace(/[/\\]+$/, '').split(/[/\\]/).slice(0, -1).join('\\')
  const item = (label: string, icon: React.ReactElement, fn: () => void) => (
    <button className="ctx-item" onClick={() => { fn(); onClose() }}>{icon}<span>{label}</span></button>
  )
  return (
    <div className="ctx-overlay" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div className="ctx-menu" style={{ left: state.x, top: state.y }}>
        {item('新建文件', <FilePlus size={14} />, () => actions.newFile(parent))}
        {item('新建文件夹', <FolderPlus size={14} />, () => actions.newFolder(parent))}
        {state.targetPath && item('删除', <Trash2 size={14} />, () => actions.del(state.targetPath!))}
      </div>
    </div>
  )
}
