import { useWorkspace } from '../../store/workspaceStore'
import './Editor.css'
export function WelcomePage() {
  const open = useWorkspace(s => s.open)
  return (
    <div className="welcome">
      <div className="welcome__logo">◆</div>
      <h1 className="welcome__title">Yanxi Code</h1>
      <p className="welcome__sub">As coding as developing</p>
      <button className="welcome__btn" onClick={open}>打开文件夹</button>
    </div>
  )
}
