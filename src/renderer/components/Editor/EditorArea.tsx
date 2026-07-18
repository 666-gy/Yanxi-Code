import { useState } from 'react'
import { useEditor } from '../../store/editorStore'
import { useWorkspace } from '../../store/workspaceStore'
import { useToast } from '../../store/toastStore'
import { useYanTeachTranslate } from '../../hooks/useYanTeachTranslate'
import { getMonacoSelection } from '../../utils/monacoBridge'
import { guessLang } from '../../utils/languageUtils'
import { CodeEditor } from './CodeEditor'
import { TabBar } from './TabBar'
import { WelcomePage } from './WelcomePage'
import { EditorContextMenu, type EditorCtxState } from './EditorContextMenu'

export function EditorArea() {
  const hasWs = useWorkspace(s => !!s.root)
  const tabs = useEditor(s => s.tabs)
  const activePath = useEditor(s => s.activePath)
  const toggleMdView = useEditor(s => s.toggleMdView)
  const push = useToast(s => s.push)
  const { translate } = useYanTeachTranslate()
  const [ctx, setCtx] = useState<EditorCtxState | null>(null)

  if (!hasWs && tabs.length === 0) return <WelcomePage />
  const activeTab = tabs.find(t => t.path === activePath)
  const isMd = activeTab?.name.toLowerCase().endsWith('.md') ?? false

  const onContext = (e: React.MouseEvent) => {
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY })
  }

  const doCopy = () => {
    // 优先用 Clipboard API，回退 execCommand
    const selection = window.getSelection()?.toString() ?? ''
    if (selection) {
      navigator.clipboard?.writeText(selection).then(() => push('已复制', 'info'))
    } else {
      document.execCommand('copy')
    }
  }

  const doPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      // 将文本插入到当前选区位置（execCommand 方式）
      document.execCommand('insertText', false, text)
    } catch {
      push('粘贴失败：无法读取剪贴板', 'error')
    }
  }

  const doTranslate = async () => {
    if (!activeTab || activeTab.binary) {
      push('请先打开可编辑的代码文件', 'info')
      return
    }
    const sel = getMonacoSelection()
    if (!sel?.text.trim()) {
      push('请先选中要讲解的代码', 'info')
      return
    }
    const result = await translate(sel.text, guessLang(activeTab.name), {
      filePath: activeTab.path,
      fileName: activeTab.name,
      startLine: sel.startLine,
      endLine: sel.endLine,
      scope: 'selection'
    })
    if (!result.ok && result.error !== '已取消') push(result.error, 'error')
  }

  return (
    <div className="editor-area">
      <TabBar />
      <div className="editor-area__body" onContextMenu={onContext}>
        <CodeEditor />
      </div>
      <EditorContextMenu
        state={ctx}
        onClose={() => setCtx(null)}
        isMd={isMd}
        mdView={activeTab?.mdView}
        actions={{
          copy: doCopy,
          paste: doPaste,
          translate: () => { void doTranslate() },
          toggleMd: () => { if (activePath) toggleMdView(activePath) }
        }}
      />
    </div>
  )
}
