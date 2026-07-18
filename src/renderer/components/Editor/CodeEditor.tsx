import { useEffect } from 'react'
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import { useEditor } from '../../store/editorStore'
import { useTheme } from '../../store/themeStore'
import { MONACO_THEMES, registerMonacoThemes } from '../../monacoThemes'
import { setMonacoEditor } from '../../utils/monacoBridge'
import { guessLang } from '../../utils/languageUtils'
import { MarkdownPreview } from './MarkdownPreview'
import './Editor.css'

export function CodeEditor() {
  const activePath = useEditor(s => s.activePath)
  const tab = useEditor(s => s.tabs.find(t => t.path === activePath))
  const setContent = useEditor(s => s.setContent)
  const themeMode = useTheme(s => s.mode)

  useEffect(() => () => setMonacoEditor(null), [])

  if (!tab) return <div className="editor-empty">选择一个文件开始编辑</div>
  if (tab.binary) return <div className="editor-binary">二进制文件不可编辑</div>
  if (tab.mdView === 'preview') return <MarkdownPreview />

  const beforeMount: BeforeMount = (monaco) => {
    registerMonacoThemes(monaco)
  }

  const onMount: OnMount = (editor) => {
    setMonacoEditor(editor)
  }

  return (
    <Editor
      key={`${tab.path}-${themeMode}`}
      theme={MONACO_THEMES[themeMode]}
      language={guessLang(tab.name)}
      value={tab.content}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(v) => {
        const next = v ?? ''
        if (next !== tab.content) setContent(tab.path, next)
      }}
      options={{
        fontFamily: "'Consolas','Cascadia Code',monospace",
        fontLigatures: true,
        fontSize: 14,
        lineHeight: 22,
        minimap: { enabled: false },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'explicit',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        tabSize: 2,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        quickSuggestions: { other: true, comments: false, strings: true },
        suggestOnTriggerCharacters: true,
        tabCompletion: 'on',
        wordBasedSuggestions: 'matchingDocuments',
        padding: { top: 14, bottom: 14 },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        contextmenu: false
      }}
    />
  )
}
