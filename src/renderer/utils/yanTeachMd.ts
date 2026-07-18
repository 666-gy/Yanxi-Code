import type { TeachRecord, TeachScope } from '../store/yanTeachStore'

export function formatTeachDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) {
    return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function teachScopeLabel(scope: TeachScope): string {
  return scope === 'file' ? '全文' : '选中'
}

export function teachLineLabel(entry: Pick<TeachRecord, 'scope' | 'startLine' | 'endLine'>): string {
  if (entry.scope === 'file') return `全文 · ${entry.endLine} 行`
  if (entry.startLine === entry.endLine) return `L${entry.startLine}`
  return `L${entry.startLine}-${entry.endLine}`
}

export function buildTeachMarkdown(entry: TeachRecord, language = 'plaintext'): string {
  const header = [
    `# Yan Teach · ${entry.fileName}`,
    '',
    `> ${formatTeachDate(entry.timestamp)} · ${teachScopeLabel(entry.scope)} · ${teachLineLabel(entry)}`,
  ]

  if (entry.scope === 'file' && entry.filePath) {
    header.push(`> 源文件：\`${entry.filePath}\``)
  }

  const parts = [...header, '']

  if (entry.scope === 'selection' && entry.code.trim()) {
    parts.push(
      '## 代码',
      '',
      '```' + language,
      entry.code,
      '```',
      ''
    )
  }

  parts.push('## 讲解', '', entry.translation, '')
  return parts.join('\n')
}

export function teachMdFileName(entry: Pick<TeachRecord, 'id' | 'fileName'>): string {
  const base = entry.fileName.replace(/[^\w.-]+/g, '_')
  return `yan-teach-${base}-${entry.id.slice(0, 8)}.md`
}
