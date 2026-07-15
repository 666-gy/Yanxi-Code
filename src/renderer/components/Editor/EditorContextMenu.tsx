import type React from 'react'
import { Copy, ClipboardPaste, Languages, Eye, Pencil } from 'lucide-react'
import '../Sidebar/Sidebar.css'

export interface EditorCtxState { x: number; y: number }

export function EditorContextMenu({ state, onClose, isMd, mdView, actions }: {
  state: EditorCtxState | null
  onClose: () => void
  isMd: boolean
  mdView: 'preview' | 'edit' | undefined
  actions: {
    copy: () => void
    paste: () => void
    translate: () => void
    toggleMd: () => void
  }
}) {
  if (!state) return null
  const item = (label: string, icon: React.ReactElement, fn: () => void) => (
    <button className="ctx-item" onClick={() => { fn(); onClose() }}>{icon}<span>{label}</span></button>
  )
  return (
    <div className="ctx-overlay" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div className="ctx-menu" style={{ left: state.x, top: state.y }}>
        {item('复制', <Copy size={14} />, actions.copy)}
        {item('粘贴', <ClipboardPaste size={14} />, actions.paste)}
        {item('翻译此处', <Languages size={14} />, actions.translate)}
        {isMd && mdView === 'preview' && item('切回编辑', <Pencil size={14} />, actions.toggleMd)}
        {isMd && mdView === 'edit' && item('切回预览', <Eye size={14} />, actions.toggleMd)}
      </div>
    </div>
  )
}
