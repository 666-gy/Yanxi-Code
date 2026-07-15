import { TitleBar } from './components/TitleBar/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorArea'
import { ToastStack } from './components/common/Toast'
import { useWorkspaceWatcher } from './hooks/useWorkspaceWatcher'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
export function App() {
  useWorkspaceWatcher()
  useGlobalShortcuts()
  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        <Sidebar />
        <EditorArea />
      </div>
      <ToastStack />
    </div>
  )
}
