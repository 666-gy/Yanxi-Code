import { useEditor } from '../../store/editorStore'
import { useWorkspace } from '../../store/workspaceStore'
import { CodeEditor } from './CodeEditor'
import { TabBar } from './TabBar'
import { WelcomePage } from './WelcomePage'
export function EditorArea() {
  const hasWs = useWorkspace(s => !!s.root)
  const tabs = useEditor(s => s.tabs)
  if (!hasWs && tabs.length === 0) return <WelcomePage />
  return (
    <div className="editor-area">
      <TabBar />
      <div className="editor-area__body"><CodeEditor /></div>
    </div>
  )
}
