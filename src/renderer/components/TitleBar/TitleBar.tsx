import { useEffect, useState } from 'react'
import { PanelLeft, Sun, Moon } from 'lucide-react'
import { MinIcon, MaxIcon, RestoreIcon, CloseIcon } from '../common/Icons'
import { useWorkspace } from '../../store/workspaceStore'
import { useUi } from '../../store/uiStore'
import { useTheme } from '../../store/themeStore'
import logo from '../../assets/logo.svg'
import './TitleBar.css'

export function TitleBar() {
  const [max, setMax] = useState(false)
  useEffect(() => (window as any).api.window.onMaximizeChange(setMax), [])
  const w = (window as any).api.window
  const open = useWorkspace(s => s.open)
  const wsRoot = useWorkspace(s => s.root)
  const toggleSidebar = useUi(s => s.toggleSidebar)
  const sidebarCollapsed = useUi(s => s.sidebarCollapsed)
  const themeMode = useTheme(s => s.mode)
  const toggleTheme = useTheme(s => s.toggle)
  const isDark = themeMode === 'dark'

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
      <button className="titlebar__action" onClick={open} title={wsRoot ?? '选择工作区文件夹'}>
        {wsRoot ?? '打开工作区'}
      </button>
      <div className="titlebar__drag" />
      <button
        className="titlebar__theme-btn"
        onClick={toggleTheme}
        title={isDark ? '切换浅色模式' : '切换深色模式'}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div className="titlebar__controls">
        <button className="tb-btn" onClick={w.minimize} title="最小化"><MinIcon size={15} /></button>
        <button className="tb-btn" onClick={w.maximizeToggle} title="最大化/还原">{max ? <RestoreIcon size={13} /> : <MaxIcon size={13} />}</button>
        <button className="tb-btn tb-btn--close" onClick={w.close} title="关闭（保留在托盘）"><CloseIcon size={15} /></button>
      </div>
    </div>
  )
}
