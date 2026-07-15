import { useEffect, useRef, useState } from 'react'
import { PanelRightClose } from 'lucide-react'
import { useUi } from '../../store/uiStore'
import { SettingsPanel } from '../Settings/SettingsPanel'
import './RightSidebar.css'

export function RightSidebar() {
  const collapse = useUi(s => s.toggleRightSidebar)
  const [width, setWidth] = useState(340)
  const dragging = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        // 鼠标越往右，宽度越小（右侧边栏宽度 = 视口右边缘 - 鼠标 x）
        const w = Math.min(560, Math.max(280, window.innerWidth - e.clientX))
        setWidth(w)
      }
    }
    const onUp = () => { dragging.current = false; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  return (
    <>
      <div
        className="rsb__resizer"
        onMouseDown={() => { dragging.current = true; document.body.style.cursor = 'col-resize' }}
      />
      <aside className="rsb" style={{ width }}>
        <div className="rsb__head">
          <span className="rsb__head-title">设置</span>
          <button className="rsb__head-btn" title="折叠设置面板" onClick={collapse}><PanelRightClose size={14} /></button>
        </div>
        <div className="rsb__body">
          <SettingsPanel />
        </div>
      </aside>
    </>
  )
}
