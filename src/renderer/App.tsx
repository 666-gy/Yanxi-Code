import { TitleBar } from './components/TitleBar/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorArea'
import { ActivityBar } from './components/common/ActivityBar'
import { SettingsModal } from './components/Settings/SettingsModal'
import { ToastStack } from './components/common/Toast'
import { useWorkspaceWatcher } from './hooks/useWorkspaceWatcher'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useUi } from './store/uiStore'
import { useSettings } from './store/settingsStore'

export function App() {
  useWorkspaceWatcher()
  useGlobalShortcuts()
  const sidebarCollapsed = useUi(s => s.sidebarCollapsed)
  const backgroundImage = useSettings(s => s.backgroundImage)
  const backgroundOpacity = useSettings(s => s.backgroundOpacity)

  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        {!sidebarCollapsed && <Sidebar />}
        <div className="app__main">
          {backgroundImage && (
            <div
              className="app__bg"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                opacity: backgroundOpacity
              }}
            />
          )}
          <EditorArea />
        </div>
        <ActivityBar />
      </div>
      <SettingsModal />
      <ToastStack />
    </div>
  )
}
