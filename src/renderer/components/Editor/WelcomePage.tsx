import { FolderOpen } from 'lucide-react'
import { useWorkspace } from '../../store/workspaceStore'
import logo from '../../assets/logo.svg'
import './Editor.css'
export function WelcomePage() {
  const open = useWorkspace(s => s.open)
  return (
    <div className="welcome">
      <img src={logo} alt="Yanxi Code" className="welcome__logo" draggable={false} />
      <h1 className="welcome__title">Yanxi Code</h1>
      <p className="welcome__sub">As coding as developing</p>
      <button className="welcome__btn welcome__btn--pill" onClick={open}>
        <FolderOpen size={15} />
        <span>打开工作区</span>
      </button>
    </div>
  )
}
