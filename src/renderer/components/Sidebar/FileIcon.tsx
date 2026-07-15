import type React from 'react'
import {
  FileCode, FileText, FileJson, FileTerminal, FileCog,
  FileArchive, FileImage, FileMusic, FileVideoCamera,
  FileSpreadsheet, FileLock, FileType, Database, Package,
  File as FileGeneric
} from 'lucide-react'
import { isBinaryPath } from '../../../shared/constants'

type Glyph = React.ReactElement

// 文本/代码类 - 颜色遵循 VSCode/Material 习惯
const codePalette: Record<string, { color: string; glyph: Glyph }> = {
  ts:  { color: '#3178c6', glyph: <FileCode size={15} /> },
  tsx: { color: '#3178c6', glyph: <FileCode size={15} /> },
  mts: { color: '#3178c6', glyph: <FileCode size={15} /> },
  cts: { color: '#3178c6', glyph: <FileCode size={15} /> },
  js:  { color: '#f7df1e', glyph: <FileCode size={15} /> },
  jsx: { color: '#f7df1e', glyph: <FileCode size={15} /> },
  mjs: { color: '#f7df1e', glyph: <FileCode size={15} /> },
  cjs: { color: '#f7df1e', glyph: <FileCode size={15} /> },
  json:{ color: '#cbcb41', glyph: <FileJson size={15} /> },
  json5:{ color: '#cbcb41', glyph: <FileJson size={15} /> },
  css: { color: '#42a5f5', glyph: <FileCode size={15} /> },
  scss:{ color: '#cf649a', glyph: <FileCode size={15} /> },
  sass:{ color: '#cf649a', glyph: <FileCode size={15} /> },
  less:{ color: '#2a4d80', glyph: <FileCode size={15} /> },
  html:{ color: '#e44d26', glyph: <FileCode size={15} /> },
  htm: { color: '#e44d26', glyph: <FileCode size={15} /> },
  xml: { color: '#f1662a', glyph: <FileCode size={15} /> },
  svg: { color: '#ffb13b', glyph: <FileCode size={15} /> },
  vue: { color: '#41b883', glyph: <FileCode size={15} /> },
  svelte:{ color: '#ff3e00', glyph: <FileCode size={15} /> },
  md:  { color: '#a6adc8', glyph: <FileText size={15} /> },
  mdx: { color: '#a6adc8', glyph: <FileText size={15} /> },
  txt: { color: '#a6adc8', glyph: <FileText size={15} /> },
  log: { color: '#a6adc8', glyph: <FileText size={15} /> },
  py:  { color: '#3776ab', glyph: <FileTerminal size={15} /> },
  pyw: { color: '#3776ab', glyph: <FileTerminal size={15} /> },
  rb:  { color: '#cc342d', glyph: <FileTerminal size={15} /> },
  go:  { color: '#00add8', glyph: <FileTerminal size={15} /> },
  rs:  { color: '#dea584', glyph: <FileTerminal size={15} /> },
  c:   { color: '#5599cc', glyph: <FileTerminal size={15} /> },
  h:   { color: '#5599cc', glyph: <FileTerminal size={15} /> },
  cpp: { color: '#9c84d8', glyph: <FileTerminal size={15} /> },
  cc:  { color: '#9c84d8', glyph: <FileTerminal size={15} /> },
  cxx: { color: '#9c84d8', glyph: <FileTerminal size={15} /> },
  hpp: { color: '#9c84d8', glyph: <FileTerminal size={15} /> },
  java:{ color: '#f89820', glyph: <FileTerminal size={15} /> },
  kt:  { color: '#7f52ff', glyph: <FileTerminal size={15} /> },
  swift:{ color: '#f05138', glyph: <FileTerminal size={15} /> },
  php: { color: '#8892bf', glyph: <FileTerminal size={15} /> },
  sh:  { color: '#89e051', glyph: <FileTerminal size={15} /> },
  bash:{ color: '#89e051', glyph: <FileTerminal size={15} /> },
  zsh: { color: '#89e051', glyph: <FileTerminal size={15} /> },
  ps1: { color: '#012456', glyph: <FileTerminal size={15} /> },
  bat: { color: '#cdd6f4', glyph: <FileTerminal size={15} /> },
  cmd: { color: '#cdd6f4', glyph: <FileTerminal size={15} /> },
  yml: { color: '#cb171e', glyph: <FileCog size={15} /> },
  yaml:{ color: '#cb171e', glyph: <FileCog size={15} /> },
  toml:{ color: '#9c4221', glyph: <FileCog size={15} /> },
  ini: { color: '#9c4221', glyph: <FileCog size={15} /> },
  conf:{ color: '#9c4221', glyph: <FileCog size={15} /> },
  env: { color: '#89b4fa', glyph: <FileCog size={15} /> },
  gitignore:{ color: '#f1502f', glyph: <FileCog size={15} /> },
  dockerfile:{ color: '#2496ed', glyph: <FileCog size={15} /> },
  csv: { color: '#1f8a4c', glyph: <FileSpreadsheet size={15} /> },
  tsv: { color: '#1f8a4c', glyph: <FileSpreadsheet size={15} /> },
  lock:{ color: '#7c8095', glyph: <FileLock size={15} /> },
}

// 二进制按子类区分（不再统一用照片图标）
const archiveExt = new Set(['zip','rar','7z','tar','gz','bz2','xz','iso','dmg','apk','tgz','tbz'])
const imageExt   = new Set(['png','jpg','jpeg','gif','bmp','ico','webp','tiff','svgz','psd','ai','heic','avif'])
const audioExt   = new Set(['mp3','wav','ogg','flac','aac','m4a','opus','wma'])
const videoExt   = new Set(['mp4','mkv','avi','mov','webm','flv','wmv','m4v'])
const dbExt      = new Set(['sqlite','db','mdb','db3','sqlitedb'])
const fontExt    = new Set(['ttf','otf','woff','woff2','eot'])
const execExt    = new Set(['exe','dll','so','dylib','bin','obj','class','jar','wasm','pyc','pyo'])
const docExt     = new Set(['pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp'])
const pcapExt    = new Set(['pcap','pcapng','cap'])

function binaryGlyph(ext: string): { color: string; glyph: Glyph } {
  if (archiveExt.has(ext)) return { color: '#f9e2af', glyph: <FileArchive size={15} /> }
  if (imageExt.has(ext))   return { color: '#f5c2e7', glyph: <FileImage size={15} /> }
  if (audioExt.has(ext))   return { color: '#f38ba8', glyph: <FileMusic size={15} /> }
  if (videoExt.has(ext))   return { color: '#cba6f7', glyph: <FileVideoCamera size={15} /> }
  if (dbExt.has(ext))      return { color: '#89dceb', glyph: <Database size={15} /> }
  if (fontExt.has(ext))    return { color: '#fab387', glyph: <FileType size={15} /> }
  if (execExt.has(ext))    return { color: '#f38ba8', glyph: <Package size={15} /> }
  if (docExt.has(ext))     return { color: '#89b4fa', glyph: <FileText size={15} /> }
  if (pcapExt.has(ext))    return { color: '#a6e3a1', glyph: <FileArchive size={15} /> }
  return { color: '#7c8095', glyph: <FileArchive size={15} /> }
}

export function FileIcon({ name, isDir }: { name: string; isDir: boolean; expanded?: boolean }) {
  // 目录的展开/折叠箭头由 FileTreeNode 的 tn__chev 负责，这里不重复渲染
  if (isDir) return null
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
  // 特殊文件名匹配（无扩展名）
  const lower = name.toLowerCase()
  if (lower === 'dockerfile') return <span style={{ color: '#2496ed', display: 'inline-flex' }}><FileCog size={15} /></span>
  if (lower === '.gitignore' || lower === '.npmignore') return <span style={{ color: '#f1502f', display: 'inline-flex' }}><FileCog size={15} /></span>

  const p = codePalette[ext]
  if (p) return <span style={{ color: p.color, display: 'inline-flex' }}>{p.glyph}</span>
  if (isBinaryPath(name)) {
    const b = binaryGlyph(ext)
    return <span style={{ color: b.color, display: 'inline-flex' }}>{b.glyph}</span>
  }
  return <span style={{ color: 'var(--text-mute)', display: 'inline-flex' }}><FileGeneric size={15} /></span>
}
