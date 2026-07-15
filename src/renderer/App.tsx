import { TitleBar } from './components/TitleBar/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorArea'
import { ToastStack } from './components/common/Toast'
import { useWorkspaceWatcher } from './hooks/useWorkspaceWatcher'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useUi } from './store/uiStore'
export function App() {
  useWorkspaceWatcher()
  useGlobalShortcuts()
  const sidebarCollapsed = useUi(s => s.sidebarCollapsed)
  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        {!sidebarCollapsed && <Sidebar />}
        <EditorArea />
      </div>
      <ToastStack />
    </div>
  )
}
