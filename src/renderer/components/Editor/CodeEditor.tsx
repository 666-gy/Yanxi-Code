import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import { useEditor } from '../../store/editorStore'
import { useSettings } from '../../store/settingsStore'
import { MarkdownPreview } from './MarkdownPreview'
import './Editor.css'

export function CodeEditor() {
  const tab = useEditor(s => s.tabs.find(t => t.path === s.activePath))
  const setContent = useEditor(s => s.setContent)
  const backgroundOpacity = useSettings(s => s.backgroundOpacity)

  if (!tab) return <div className="editor-empty">选择一个文件开始编辑</div>
  if (tab.binary) return <div className="editor-binary">二进制文件不可编辑</div>
  // md 文件默认预览模式，切换到编辑模式时才显示 Monaco
  if (tab.mdView === 'preview') return <MarkdownPreview />

  // Monaco 编辑器背景也使用半透明，让自定义背景图透出
  const editorBgAlpha = 1 - backgroundOpacity
  const editorBg = `rgba(30,30,46,${editorBgAlpha})`

  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('yanxi', {
      base: 'vs-dark', inherit: true,
      rules: [],
      colors: {
        'editor.background': editorBg,
        'editor.foreground': '#cdd6f4',
        'editorGutter.background': editorBg
      }
    })
  }

  const onMount: OnMount = (_editor, monaco) => {
    // 编辑器挂载后重新定义主题（背景透明度可能随设置变化）
    monaco.editor.defineTheme('yanxi', {
      base: 'vs-dark', inherit: true,
      rules: [],
      colors: {
        'editor.background': editorBg,
        'editor.foreground': '#cdd6f4',
        'editorGutter.background': editorBg
      }
    })
    monaco.editor.setTheme('yanxi')
  }

  return (
    <Editor
      key={tab.path}
      theme="yanxi"
      language={guessLang(tab.name)}
      value={tab.content}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(v) => setContent(tab.path, v ?? '')}
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

function guessLang(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', css: 'css', html: 'html', md: 'markdown', py: 'python' }
  return map[ext] ?? 'plaintext'
}
