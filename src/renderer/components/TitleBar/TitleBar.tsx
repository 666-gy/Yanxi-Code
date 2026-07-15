import { useEffect, useState } from 'react'
import { MinIcon, MaxIcon, RestoreIcon, CloseIcon } from '../common/Icons'
import { useWorkspace } from '../../store/workspaceStore'
import './TitleBar.css'

export function TitleBar() {
  const [max, setMax] = useState(false)
  useEffect(() => (window as any).api.window.onMaximizeChange(setMax), [])
  const w = (window as any).api.window
  const open = useWorkspace(s => s.open)
  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        <span className="titlebar__logo">◆</span> Yanxi Code
      </div>
      <button className="titlebar__action" onClick={open}>打开文件夹</button>
      <div className="titlebar__drag" />
      <div className="titlebar__controls">
        <button className="tb-btn" onClick={w.minimize} title="最小化"><MinIcon size={15} /></button>
        <button className="tb-btn" onClick={w.maximizeToggle} title="最大化/还原">{max ? <RestoreIcon size={13} /> : <MaxIcon size={13} />}</button>
        <button className="tb-btn tb-btn--close" onClick={w.close} title="关闭"><CloseIcon size={15} /></button>
      </div>
    </div>
  )
}
