import { useEffect, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import { MinIcon, MaxIcon, RestoreIcon, CloseIcon } from '../common/Icons'
import { useWorkspace } from '../../store/workspaceStore'
import { useUi } from '../../store/uiStore'
import logo from '../../assets/logo.svg'
import './TitleBar.css'

export function TitleBar() {
  const [max, setMax] = useState(false)
  useEffect(() => (window as any).api.window.onMaximizeChange(setMax), [])
  const w = (window as any).api.window
  const open = useWorkspace(s => s.open)
  const toggleSidebar = useUi(s => s.toggleSidebar)
  const sidebarCollapsed = useUi(s => s.sidebarCollapsed)
  return (
    <div className="titlebar">
      <button
        className={`titlebar__side-btn ${sidebarCollapsed ? 'is-active' : ''}`}
        onClick={toggleSidebar}
        title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        <PanelLeft size={16} />
      </button>
      <div className="titlebar__brand">
        <img src={logo} alt="Yanxi Code" className="titlebar__logo" draggable={false} />
        <span className="titlebar__brand-text">Yanxi Code</span>
      </div>
      <button className="titlebar__action" onClick={open}>打开文件夹</button>
      <div className="titlebar__drag" />
      <div className="titlebar__controls">
        <button className="tb-btn" onClick={w.minimize} title="最小化"><MinIcon size={15} /></button>
        <button className="tb-btn" onClick={w.maximizeToggle} title="最大化/还原">{max ? <RestoreIcon size={13} /> : <MaxIcon size={13} />}</button>
        <button className="tb-btn tb-btn--close" onClick={w.close} title="关闭"><CloseIcon size={15} /></button>
      </div>
    </div>
  )
}
