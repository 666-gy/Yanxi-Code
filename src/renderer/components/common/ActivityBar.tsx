import { useState } from 'react'
import { Settings } from 'lucide-react'
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

  return (
    <nav className="activity-bar" onMouseLeave={() => setTooltip(null)}>
      {/* 底部图标组 */}
      <div className="activity-bar__bottom">
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
