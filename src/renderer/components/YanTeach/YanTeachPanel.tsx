import { useMemo, useState } from 'react'
import {
  GraduationCap, X, Trash2, FileText, WholeWord, Languages, Sparkles, Loader2, ExternalLink
} from 'lucide-react'
import { useYanTeach, type TeachRecord, type TeachScope } from '../../store/yanTeachStore'
import { useEditor } from '../../store/editorStore'
import { useWorkspace } from '../../store/workspaceStore'
import { useToast } from '../../store/toastStore'
import { useYanTeachTranslate } from '../../hooks/useYanTeachTranslate'
import { guessLang } from '../../utils/languageUtils'
import { formatTeachDate, teachLineLabel, teachScopeLabel } from '../../utils/yanTeachMd'
import { deleteTeachMarkdown, openTeachRecord } from '../../services/yanTeachFiles'
import './YanTeachPanel.css'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseTabOptions(key: string): { path: string; name: string }[] {
  if (!key) return []
  return key.split('\n').map((line) => {
    const sep = line.indexOf('\t')
    if (sep === -1) return { path: line, name: line }
    return { path: line.slice(0, sep), name: line.slice(sep + 1) }
  })
}

/** 面板关闭时不挂载，避免无效 store 订阅导致 React 19 无限更新。 */
export function YanTeachPanel() {
  const panelOpen = useYanTeach((s) => s.panelOpen)
  if (!panelOpen) return null
  return <YanTeachPanelBody />
}

function YanTeachPanelBody() {
  const setPanelOpen = useYanTeach((s) => s.setPanelOpen)
  const records = useYanTeach((s) => s.records)
  const removeRecord = useYanTeach((s) => s.removeRecord)
  const updateRecord = useYanTeach((s) => s.updateRecord)
  const clearRecords = useYanTeach((s) => s.clearRecords)
  const streamingText = useYanTeach((s) => s.streamingText)
  const isTranslating = useYanTeach((s) => s.isTranslating)
  const aiStatus = useYanTeach((s) => s.aiStatus)

  const workspaceRoot = useWorkspace((s) => s.root)
  const activePath = useEditor((s) => s.activePath)
  const tabOptionsKey = useEditor((s) =>
    s.tabs.filter((t) => !t.binary).map((t) => `${t.path}\t${t.name}`).join('\n')
  )
  const tabOptions = useMemo(() => parseTabOptions(tabOptionsKey), [tabOptionsKey])
  const { translate } = useYanTeachTranslate()
  const push = useToast((s) => s.push)

  const [filePathOverride, setFilePathOverride] = useState<string | null>(null)

  const filePath = useMemo(() => {
    if (filePathOverride && tabOptions.some((t) => t.path === filePathOverride)) {
      return filePathOverride
    }
    if (activePath && tabOptions.some((t) => t.path === activePath)) {
      return activePath
    }
    return tabOptions[0]?.path ?? ''
  }, [filePathOverride, activePath, tabOptions])

  const openRecord = async (entry: TeachRecord) => {
    if (!workspaceRoot) {
      push('请先打开工作区', 'info')
      return
    }
    try {
      const mdPath = await openTeachRecord(entry, workspaceRoot)
      if (!mdPath) return
      if (mdPath !== entry.mdPath) updateRecord(entry.id, { mdPath })
    } catch {
      push('打开讲解文档失败', 'error')
    }
  }

  const deleteRecord = async (entry: TeachRecord) => {
    await deleteTeachMarkdown(entry.mdPath)
    removeRecord(entry.id)
  }

  const clearAll = async () => {
    if (!confirm('确定清空全部讲解记录？')) return
    for (const entry of records) await deleteTeachMarkdown(entry.mdPath)
    clearRecords()
  }

  const translateSelectedFile = async () => {
    const tab = useEditor.getState().tabs.find((t) => t.path === filePath && !t.binary)
    if (!tab) {
      push('请先打开要讲解的文件', 'info')
      return
    }
    const result = await translate(tab.content, guessLang(tab.name), {
      filePath: tab.path,
      fileName: tab.name,
      startLine: 1,
      endLine: tab.content.split('\n').length,
      scope: 'file'
    })
    if (!result.ok && result.error !== '已取消') push(result.error, 'error')
  }

  return (
    <aside className="yan-teach">
      <header className="yan-teach__header">
        <div className="yan-teach__brand">
          <div className="yan-teach__icon">
            <GraduationCap size={18} />
          </div>
          <div>
            <h2 className="yan-teach__title">Yan Teach</h2>
            <p className="yan-teach__subtitle">{records.length} 条讲解记录</p>
          </div>
        </div>
        <div className="yan-teach__header-actions">
          {records.length > 0 && (
            <button className="yan-teach__icon-btn" title="清空全部" onClick={() => void clearAll()}>
              <Trash2 size={15} />
            </button>
          )}
          <button className="yan-teach__icon-btn" title="收起面板" onClick={() => setPanelOpen(false)}>
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="yan-teach__hint">
        <Languages size={13} />
        <span>
          讲解结果会保存为 <strong>.yan-teach/*.md</strong> 并在编辑器打开；点击历史记录可再次打开
        </span>
      </div>

      <div className="yan-teach__file-bar">
        <select
          className="yan-teach__file-select"
          value={filePath}
          onChange={(e) => setFilePathOverride(e.target.value)}
          disabled={tabOptions.length === 0 || isTranslating}
        >
          {tabOptions.length === 0
            ? <option value="">暂无打开的文件</option>
            : tabOptions.map((t) => <option key={t.path} value={t.path}>{t.name}</option>)}
        </select>
        <button
          className="yan-teach__file-btn"
          disabled={!filePath || isTranslating}
          onClick={() => void translateSelectedFile()}
        >
          {isTranslating ? <Loader2 size={14} className="yan-teach__spin" /> : <WholeWord size={14} />}
          翻译文件
        </button>
      </div>

      {isTranslating && (
        <div className="yan-teach__live">
          <div className="yan-teach__live-head">
            <Sparkles size={14} />
            <span>
              {aiStatus === 'thinking'
                ? 'AI 思考中…'
                : `正在生成讲解文档…${streamingText ? `（${streamingText.length} 字）` : ''}`}
            </span>
            <div className="yan-teach__dots"><span /><span /><span /></div>
          </div>
        </div>
      )}

      <div className="yan-teach__list">
        {!isTranslating && records.length === 0 && (
          <div className="yan-teach__empty">
            <div className="yan-teach__empty-icon">
              <GraduationCap size={24} />
            </div>
            <p>暂无讲解记录</p>
            <span>右键选中代码，或使用上方「翻译文件」</span>
          </div>
        )}

        {records.map((entry) => {
          const isFile = entry.scope === 'file'
          return (
            <article key={entry.id} className="yan-teach__entry">
              <div
                className="yan-teach__entry-head is-clickable"
                onClick={() => void openRecord(entry)}
                title="在编辑器中打开讲解文档"
              >
                {isFile ? <WholeWord size={13} /> : <FileText size={13} />}
                <span className="yan-teach__entry-name">{entry.fileName}</span>
                <span className={`yan-teach__badge ${isFile ? 'is-file' : ''}`}>
                  {teachScopeLabel(entry.scope as TeachScope)}
                </span>
                <span className="yan-teach__lines">{teachLineLabel(entry)}</span>
                <span className="yan-teach__time">{formatTime(entry.timestamp)}</span>
                <ExternalLink size={12} className="yan-teach__entry-open" />
                <button
                  className="yan-teach__entry-del"
                  type="button"
                  title="删除"
                  onClick={(e) => { e.stopPropagation(); void deleteRecord(entry) }}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="yan-teach__entry-meta">{formatTeachDate(entry.timestamp)}</div>
            </article>
          )
        })}
      </div>

      <footer className="yan-teach__footer">
        <span>{isTranslating ? '讲解进行中' : '就绪'}</span>
        <div className="yan-teach__status">
          <span className={`yan-teach__dot ${aiStatus}`} />
          <span>
            {aiStatus === 'idle' ? 'AI 就绪' :
             aiStatus === 'thinking' ? '思考中' :
             aiStatus === 'streaming' ? '输出中' :
             aiStatus === 'error' ? '出错' : '离线'}
          </span>
        </div>
      </footer>
    </aside>
  )
}
