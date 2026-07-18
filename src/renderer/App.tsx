import { TitleBar } from './components/TitleBar/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorArea'
import { ActivityBar } from './components/common/ActivityBar'
import { SettingsModal } from './components/Settings/SettingsModal'
import { YanTeachPanel } from './components/YanTeach/YanTeachPanel'
import { ToastStack } from './components/common/Toast'
import { useWorkspaceWatcher } from './hooks/useWorkspaceWatcher'
import { useYanAgentWorkspaceSync } from './hooks/useYanAgentWorkspaceSync'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useThemeSync } from './hooks/useThemeSync'
import { useUi } from './store/uiStore'

export function App() {
  useYanAgentWorkspaceSync()
  useWorkspaceWatcher()
  useGlobalShortcuts()
  useThemeSync()
  const sidebarCollapsed = useUi(s => s.sidebarCollapsed)

  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        {!sidebarCollapsed && <Sidebar />}
        <div className="app__main">
          <EditorArea />
        </div>
        <YanTeachPanel />
        <ActivityBar />
      </div>
      <SettingsModal />
      <ToastStack />
    </div>
  )
}
