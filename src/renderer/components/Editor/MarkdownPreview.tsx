import { useMemo } from 'react'
import { marked } from 'marked'
import { useEditor } from '../../store/editorStore'
import './Editor.css'

// 配置 marked：启用 GFM、换行转 <br>
marked.setOptions({ gfm: true, breaks: true })

export function MarkdownPreview() {
  const tab = useEditor(s => s.tabs.find(t => t.path === s.activePath))
  const html = useMemo(() => {
    if (!tab) return ''
    try { return marked.parse(tab.content) as string } catch { return '<p>渲染失败</p>' }
  }, [tab?.content])

  if (!tab) return <div className="editor-empty">选择一个文件开始编辑</div>

  return (
    <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
