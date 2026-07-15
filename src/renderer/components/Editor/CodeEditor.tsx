import Editor, { type BeforeMount } from '@monaco-editor/react'
import { useEditor } from '../../store/editorStore'
import { MarkdownPreview } from './MarkdownPreview'
import './Editor.css'

export function CodeEditor() {
  const tab = useEditor(s => s.tabs.find(t => t.path === s.activePath))
  const setContent = useEditor(s => s.setContent)

  if (!tab) return <div className="editor-empty">选择一个文件开始编辑</div>
  if (tab.binary) return <div className="editor-binary">二进制文件不可编辑</div>
  // md 文件默认预览模式，切换到编辑模式时才显示 Monaco
  if (tab.mdView === 'preview') return <MarkdownPreview />

  // Monaco editor.background 只支持 hex，不支持 rgba。
  // 改为用 CSS !important 覆盖 Monaco DOM 背景为 transparent，
  // 由 .editor-area__body 的半透明背景控制透明度。
  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('yanxi', {
      base: 'vs-dark', inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4'
      }
    })
  }

  return (
    <Editor
      key={tab.path}
      theme="yanxi"
      language={guessLang(tab.name)}
      value={tab.content}
      beforeMount={beforeMount}
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
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', html: 'html', md: 'markdown', py: 'python',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
    java: 'java', kt: 'kotlin', go: 'go', rs: 'rust', rb: 'ruby',
    php: 'php', swift: 'swift', scss: 'scss', less: 'less',
    xml: 'xml', yaml: 'yaml', yml: 'yaml', sh: 'shell', bash: 'shell',
    sql: 'sql', dockerfile: 'dockerfile', makefile: 'makefile'
  }
  return map[ext] ?? 'plaintext'
}
