import { useState } from 'react'
import { X } from 'lucide-react'
import { useEditor } from '../../store/editorStore'
import { ConfirmDialog } from '../common/ConfirmDialog'
export function TabBar() {
  const tabs = useEditor(s => s.tabs)
  const active = useEditor(s => s.activePath)
  const setActive = useEditor(s => s.setActive)
  const closeTab = useEditor(s => s.closeTab)
  const [confirm, setConfirm] = useState<string | null>(null)
  return (
    <>
      <div className="tabbar">
        {tabs.map(t => (
          <div key={t.path} className={`tab ${t.path === active ? 'tab--active' : ''}`} onClick={() => setActive(t.path)}>
            <span className={`tab__dot ${t.dirty ? 'tab__dot--dirty' : ''}`} />
            <span className="tab__name">{t.name}</span>
            <button className="tab__close" onClick={(e) => {
              e.stopPropagation()
              if (t.dirty) setConfirm(t.path); else closeTab(t.path)
            }}><X size={12} /></button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="未保存的更改"
        message={`“${confirm?.split('\\').pop()}” 尚未保存，确认关闭？`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (confirm) closeTab(confirm); setConfirm(null) }}
      />
    </>
  )
}
