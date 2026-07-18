import { useState } from 'react'
import { Settings, GraduationCap, Bot, RefreshCw } from 'lucide-react'
import { useUi } from '../../store/uiStore'
import { useYanTeach } from '../../store/yanTeachStore'
import { useWorkspace } from '../../store/workspaceStore'
import { useToast } from '../../store/toastStore'
import { api } from '../../services/ipc'
import { ConfirmDialog } from './ConfirmDialog'
import './ActivityBar.css'

export function ActivityBar() {
  const settingsOpen = useUi(s => s.settingsOpen)
  const toggleSettings = useUi(s => s.toggleSettings)
  const yanTeachOpen = useYanTeach(s => s.panelOpen)
  const toggleYanTeach = useYanTeach(s => s.togglePanel)
  const workspaceRoot = useWorkspace(s => s.root)
  const push = useToast(s => s.push)
  const [tooltip, setTooltip] = useState<{ text: string; y: number } | null>(null)
  const [agentMissingOpen, setAgentMissingOpen] = useState(false)
  const [agentLaunching, setAgentLaunching] = useState(false)

  const computeY = (el: HTMLElement) => {
    const nav = el.closest('nav')
    return nav ? el.offsetTop : 0
  }

  const openYanAgent = async () => {
    if (agentLaunching) return
    setAgentLaunching(true)
    try {
      const result = await api.agent.openAndSync(workspaceRoot)
      if ('error' in result) {
        if (/未检测到 Yan Agent/.test(result.error)) setAgentMissingOpen(true)
        else push(result.error, 'error')
        return
      }
      if (!workspaceRoot) {
        push(result.alreadyRunning ? '已打开 Yan Agent' : '正在打开 Yan Agent', 'info')
      } else {
        push(
          result.alreadyRunning ? '工作区已同步至 Yan Agent' : '正在打开 Yan Agent 并同步工作区',
          'info',
        )
      }
    } catch (error) {
      push(error instanceof Error ? error.message : '启动 Yan Agent 失败', 'error')
    } finally {
      setAgentLaunching(false)
    }
  }

  return (
    <nav className="activity-bar" onMouseLeave={() => setTooltip(null)}>
      {/* 顶部功能按钮组 */}
      <div className="activity-bar__top">
        <button
          className={`activity-icon ${yanTeachOpen ? 'is-active is-teach' : ''}`}
          onClick={toggleYanTeach}
          onMouseEnter={(e) => setTooltip({ text: 'Yan Teach', y: computeY(e.currentTarget) })}
          title="Yan Teach"
        >
          {yanTeachOpen && <span className="activity-icon__indicator" />}
          <GraduationCap size={20} />
        </button>
        <button
          className={`activity-icon ${agentLaunching ? 'is-busy' : ''}`}
          onClick={openYanAgent}
          onMouseEnter={(e) => setTooltip({ text: agentLaunching ? '正在打开 Yan Agent' : 'Yan Agent', y: computeY(e.currentTarget) })}
          title={agentLaunching ? '正在打开 Yan Agent' : 'Yan Agent'}
          aria-label={agentLaunching ? '正在打开 Yan Agent' : '打开 Yan Agent'}
          disabled={agentLaunching}
        >
          {agentLaunching ? <RefreshCw className="activity-icon__spin" size={19} /> : <Bot size={20} />}
        </button>
      </div>

      {/* 底部按钮组 */}
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

      <ConfirmDialog
        open={agentMissingOpen}
        title="未检测到 Yan Agent"
        message="你的电脑尚未安装 Yan Agent。安装后可在 Yanxi Code 与 Agent 之间同步工作区。下载地址：github.com/666-gy/Yan-Agent/releases"
        onCancel={() => setAgentMissingOpen(false)}
        onConfirm={() => setAgentMissingOpen(false)}
      />
    </nav>
  )
}
