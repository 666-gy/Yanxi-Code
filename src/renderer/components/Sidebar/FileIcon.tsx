import type React from 'react'
import { isBinaryPath } from '../../../shared/constants'
import { File, FileCode, FileText, FileJson, Image, FileTerminal } from 'lucide-react'

const palette: Record<string, { color: string; glyph: React.ReactElement }> = {
  ts:  { color: '#3178c6', glyph: <FileCode size={16} /> },
  tsx: { color: '#3178c6', glyph: <FileCode size={16} /> },
  js:  { color: '#f7df1e', glyph: <FileCode size={16} /> },
  jsx: { color: '#f7df1e', glyph: <FileCode size={16} /> },
  json:{ color: '#cbcb41', glyph: <FileJson size={16} /> },
  css: { color: '#42a5f5', glyph: <FileCode size={16} /> },
  html:{ color: '#e44d26', glyph: <FileCode size={16} /> },
  md:  { color: '#a6adc8', glyph: <FileText size={16} /> },
  py:  { color: '#3776ab', glyph: <FileTerminal size={16} /> },
}
export function FileIcon({ name, isDir, expanded }: { name: string; isDir: boolean; expanded?: boolean }) {
  if (isDir) return <span style={{ color: expanded ? 'var(--accent)' : 'var(--accent-2)' }}>▾</span>
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  const p = palette[ext]
  if (p) return <span style={{ color: p.color, display:'inline-flex' }}>{p.glyph}</span>
  if (isBinaryPath(name)) return <span style={{ color: '#f9e2af' }}><Image size={15} /></span>
  return <span style={{ color: 'var(--text-mute)' }}><File size={15} /></span>
}
