import { useState } from 'react'
import { Settings, GraduationCap, Bot, RefreshCw } from 'lucide-react'
import { useUi } from '../../store/uiStore'
import './ActivityBar.css'

export function ActivityBar() {
  const settingsOpen = useUi(s => s.settingsOpen)
  const toggleSettings = useUi(s => s.toggleSettings)
  const [tooltip, setTooltip] = useState<{ text: string; y: number } | null>(null)

  const computeY = (el: HTMLElement) => {
    const nav = el.closest('nav')
    return nav ? el.offsetTop : 0
  }

  // 占位 onClick —— 后续接入逻辑
  const noop = () => {}

  return (
    <nav className="activity-bar" onMouseLeave={() => setTooltip(null)}>
      {/* 顶部功能按钮组 */}
      <div className="activity-bar__top">
        <button
          className="activity-icon"
          onClick={noop}
          onMouseEnter={(e) => setTooltip({ text: '博士帽', y: computeY(e.currentTarget) })}
          title="博士帽"
        >
          <GraduationCap size={20} />
        </button>
        <button
          className="activity-icon"
          onClick={noop}
          onMouseEnter={(e) => setTooltip({ text: 'Agent', y: computeY(e.currentTarget) })}
          title="Agent"
        >
          <Bot size={20} />
        </button>
      </div>

      {/* 底部按钮组 */}
      <div className="activity-bar__bottom">
        <button
          className="activity-icon"
          onClick={noop}
          onMouseEnter={(e) => setTooltip({ text: '版本检查', y: computeY(e.currentTarget) })}
          title="版本检查"
        >
          <RefreshCw size={20} />
        </button>
        <button
          className={`activity-icon ${settingsOpen ? 'is-active' : ''}`}
          onClick={toggleSettings}
          onMouseEnter={(e) => setTooltip({ text: '设置', y: computeY(e.currentTarget) })}
        >
          {settingsOpen && <span className="activity-icon__indicator" />}
          <Settings size={20} />
        </button>
      </div>

      {tooltip && (
        <div className="activity-tooltip" style={{ top: tooltip.y + 12 }}>
          {tooltip.text}
        </div>
      )}
    </nav>
  )
}
