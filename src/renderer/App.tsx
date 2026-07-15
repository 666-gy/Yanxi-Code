import { TitleBar } from './components/TitleBar/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorArea'
import { ToastStack } from './components/common/Toast'
import { useWorkspaceWatcher } from './hooks/useWorkspaceWatcher'
export function App() {
  useWorkspaceWatcher()
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
