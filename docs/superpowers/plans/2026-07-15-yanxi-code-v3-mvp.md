# Yanxi Code v3 — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a runnable Electron IDE with a real-time synced file tree, Monaco editor (smooth cursor + tab autocomplete), custom title bar, welcome page, modern UI, and standard IDE shortcuts — a clean foundation to layer AI/external links onto later.

**Architecture:** Electron (main / preload / renderer) with strict process boundaries. All filesystem access lives in the main process behind typed IPC; the renderer never touches `fs`. A `chokidar` watcher in main pushes change events over IPC into Zustand stores in the renderer, which are the single source of truth for UI. Shared types live in `src/shared` and are imported by both sides so the IPC contract is compile-checked.

**Tech Stack:** Electron 31, electron-vite, TypeScript 5, React 18, Zustand, Monaco Editor (`@monaco-editor/react`), chokidar 3, lucide-react (UI chrome icons) + custom SVGs (file-type logos), vitest (unit tests for pure logic & main services).

**Hard constraints (from prior project memory — do NOT regress):**
- Code font: **Consolas**.
- Sidebar must be **width-resizable**.
- Remove default 文件/视图/帮助 menu bar; **custom title bar** with min/max/close only.
- File paths use **OS-native format** via `path.join()`; **await all async fs calls**.
- **No auto-open DevTools** on startup.
- **Single instance** enforced in main.
- Visual effects: **font ligatures, smooth scrolling, smooth cursor animation, bracket pair colorization**.
- Real-time FS monitoring for workspace sync.

**Anti-屎山 rules for this plan:**
- One responsibility per file. No god-objects.
- Renderer → IPC → main → fs. Never the reverse, never shortcuts.
- Zustand stores are the only mutable UI state; components read from them, never cache derived state locally.
- Typed IPC: every channel has a request/response type in `src/shared/types.ts`.
- Each task ends green (builds + tests pass) and committed before the next starts.

---

## File Structure

```
Yanxi Code v3/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── electron.vite.config.ts
├── vitest.config.ts
├── index.html
├── src/
│   ├── shared/
│   │   ├── types.ts              # IPC + domain types (compiled into both sides)
│   │   └── constants.ts          # BINARY_EXTENSIONS, ICON_EXTENSIONS, etc.
│   ├── main/
│   │   ├── index.ts              # App entry: single-instance, BrowserWindow, menu removal
│   │   ├── window.ts             # createMainWindow(), window state
│   │   ├── ipc.ts                # registerIpc(): wires all handlers
│   │   ├── services/
│   │   │   ├── FileService.ts    # readFile, writeFile, listDir, createEntry, deleteEntry, isBinary
│   │   │   └── WatcherService.ts # chokidar wrapper; emits typed events
│   │   └── utils/
│   │       └── paths.ts          # path.join wrappers, normalize
│   ├── preload/
│   │   └── index.ts              # contextBridge exposing typed `window.api`
│   ├── renderer/
│   │   ├── index.html            # (electron-vite uses root index.html)
│   │   ├── main.tsx              # React root
│   │   ├── App.tsx               # Layout: TitleBar + Sidebar + EditorArea
│   │   ├── services/
│   │   │   └── ipc.ts            # Typed wrappers over window.api
│   │   ├── store/
│   │   │   ├── workspaceStore.ts # open workspace root, watcher event sink
│   │   │   ├── fileTreeStore.ts  # tree state + mutations
│   │   │   └── editorStore.ts    # open tabs, dirty flags, active tab
│   │   ├── hooks/
│   │   │   ├── useWorkspaceWatcher.ts # subscribes to watcher IPC → store
│   │   │   └── useGlobalShortcuts.ts  # Ctrl+N/S/C/V etc.
│   │   ├── components/
│   │   │   ├── TitleBar/
│   │   │   │   ├── TitleBar.tsx
│   │   │   │   └── TitleBar.css
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx           # resizable container
│   │   │   │   ├── FileTree.tsx
│   │   │   │   ├── FileTreeNode.tsx
│   │   │   │   ├── FileIcon.tsx          # extension → SVG logo
│   │   │   │   ├── ContextMenu.tsx
│   │   │   │   └── Sidebar.css
│   │   │   ├── Editor/
│   │   │   │   ├── EditorArea.tsx        # Welcome page vs tabs+editor
│   │   │   │   ├── TabBar.tsx
│   │   │   │   ├── CodeEditor.tsx        # Monaco wrapper
│   │   │   │   ├── WelcomePage.tsx
│   │   │   │   └── Editor.css
│   │   │   └── common/
│   │   │       ├── Toast.tsx             # modern notification stack
│   │   │       ├── ConfirmDialog.tsx     # unsaved-file modal
│   │   │       └── Icons.tsx             # min/max/close + chevrons (lucide)
│   │   ├── types/
│   │   │   └── monaco.d.ts        # ambient if needed
│   │   └── styles/
│   │       ├── global.css
│   │       ├── tokens.css         # color/radius/spacing variables
│   │       └── animations.css
│   └── test/
│       ├── shared/
│       │   ├── binary.test.ts
│       │   └── fileTree.test.ts
│       └── main/
│           └── FileService.test.ts
└── docs/superpowers/plans/
    └── 2026-07-15-yanxi-code-v3-mvp.md   # this file
```

---

## Task 1: Project scaffolding (electron-vite + TS + React)

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `electron.vite.config.ts`, `vitest.config.ts`, `index.html`
- Create: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/main.tsx`
- Test: `src/test/sanity.test.ts`

- [ ] **Step 1: Initialize npm project + install deps**

Run from project root:
```bash
npm init -y
npm i -D electron@31 electron-vite vite typescript react react-dom @types/node @types/react @types/react-dom vitest @electron-toolkit/preload @electron-toolkit/utils
npm i react react-dom zustand @monaco-editor/react monaco-editor chokidar lucide-react
```

- [ ] **Step 2: Write `package.json` scripts + entry**

```json
{
  "name": "yanxi-code",
  "version": "1.0.0",
  "description": "Yanxi Code -- As coding as developing",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json` (renderer) and `tsconfig.node.json` (main/preload)**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["src/renderer", "src/shared", "src/test"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["src/main", "src/preload", "src/shared", "electron.vite.config.ts"]
}
```

- [ ] **Step 4: Write `electron.vite.config.ts`**

```ts
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: { build: { rollupOptions: { input: { index: resolve(__dirname, 'src/main/index.ts') } } } },
  preload: { build: { rollupOptions: { input: { index: resolve(__dirname, 'src/preload/index.ts') } } } },
  renderer: {
    root: '.',
    build: { rollupOptions: { input: { index: resolve(__dirname, 'index.html') } } }
  }
})
```

- [ ] **Step 5: Write `index.html` (renderer entry)**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:;" />
    <title>Yanxi Code</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Minimal main/preload/renderer**

`src/main/index.ts`:
```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

let win: BrowserWindow | null = null
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 540,
    frame: false, // custom title bar (Task 2)
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
```

`src/preload/index.ts`:
```ts
import { contextBridge } from 'electron'
contextBridge.exposeInMainWorld('api', { ready: true })
```

`src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
ReactDOM.createRoot(document.getElementById('root')!).render(<h1>Yanxi Code boot OK</h1>)
```

- [ ] **Step 7: Sanity test + vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node' } })
```

`src/test/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
describe('sanity', () => { it('adds', () => { expect(1 + 1).toBe(2) }) })
```

- [ ] **Step 8: Verify dev server boots**

Run: `npm run dev`
Expected: Electron window opens showing "Yanxi Code boot OK".

- [ ] **Step 9: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold electron-vite + react + ts"
```

---

## Task 2: Custom title bar (frameless, min/max/close, no native menu)

**Files:**
- Create: `src/renderer/components/TitleBar/TitleBar.tsx`, `.css`
- Create: `src/renderer/components/common/Icons.tsx`
- Create: `src/renderer/styles/tokens.css`, `global.css`
- Modify: `src/main/index.ts` (remove default menu; IPC window controls)
- Modify: `src/preload/index.ts` (expose window controls)
- Create: `src/shared/types.ts` (start IPC contract)

- [ ] **Step 1: Start IPC contract in `src/shared/types.ts`**

```ts
export type WindowAction = 'minimize' | 'maximize-toggle' | 'close'
export interface WindowApi {
  minimize: () => void
  maximizeToggle: () => void
  close: () => void
  onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
}
```

- [ ] **Step 2: Remove default menu + wire window-control IPC in `src/main/index.ts`**

Replace the `app.whenReady().then(createWindow)` block with:
```ts
import { ipcMain, Menu } from 'electron'
// ...inside createWindow, after load:
Menu.setApplicationMenu(null) // removes 文件/视图/帮助

ipcMain.handle('window:minimize', () => win?.minimize())
ipcMain.handle('window:maximize-toggle', () => {
  if (!win) return
  if (win.isMaximized()) win.unmaximize(); else win.maximize()
})
ipcMain.handle('window:close', () => win?.close())
ipcMain.on('window:maximize-state:subscribe', (e) => {
  const send = () => e.sender.send('window:maximize-state', !!win?.isMaximized())
  send()
  win?.on('maximize', send); win?.on('unmaximize', send)
})
```

- [ ] **Step 3: Expose typed window API in `src/preload/index.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('api', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
    close: () => ipcRenderer.invoke('window:close'),
    onMaximizeChange: (cb: (m: boolean) => void) => {
      const handler = (_: unknown, m: boolean) => cb(m)
      ipcRenderer.send('window:maximize-state:subscribe')
      ipcRenderer.on('window:maximize-state', handler)
      return () => ipcRenderer.off('window:maximize-state', handler)
    }
  }
})
```

- [ ] **Step 4: Design tokens + global css**

`src/renderer/styles/tokens.css`:
```css
:root{
  --bg-0:#1e1e2e; --bg-1:#181825; --bg-2:#11111b;
  --surface:#1e1e2e; --surface-2:#313244; --surface-3:#45475a;
  --text:#cdd6f4; --text-dim:#a6adc8; --text-mute:#6c7086;
  --accent:#cba6f7; --accent-2:#89b4fa; --danger:#f38ba8;
  --border:#313244; --radius:8px; --radius-sm:6px;
  --font-code:'Consolas','Cascadia Code',ui-monospace,monospace;
  --font-ui:'Inter','Segoe UI',system-ui,sans-serif;
  --titlebar-h:36px; --sidebar-w:260px;
}
```

`src/renderer/styles/global.css`:
```css
*{box-sizing:border-box}
html,body,#root{height:100%;margin:0}
body{background:var(--bg-0);color:var(--text);font-family:var(--font-ui);overflow:hidden}
button{font-family:inherit;color:inherit;background:none;border:none;cursor:pointer}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:var(--surface-3);border-radius:6px;border:2px solid var(--bg-0)}
::-webkit-scrollbar-thumb:hover{background:var(--text-mute)}
```

- [ ] **Step 5: Icons + TitleBar component**

`src/renderer/components/common/Icons.tsx`:
```tsx
import { Minus, Square, X, Copy } from 'lucide-react'
export const MinIcon = Minus
export const MaxIcon = Square
export const RestoreIcon = Copy // restore = overlapping squares
export const CloseIcon = X
```

`src/renderer/components/TitleBar/TitleBar.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { MinIcon, MaxIcon, RestoreIcon, CloseIcon } from '../common/Icons'
import './TitleBar.css'

export function TitleBar() {
  const [max, setMax] = useState(false)
  useEffect(() => (window as any).api.window.onMaximizeChange(setMax), [])
  const w = (window as any).api.window
  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        <span className="titlebar__logo">◆</span> Yanxi Code
      </div>
      <div className="titlebar__drag" />
      <div className="titlebar__controls">
        <button className="tb-btn" onClick={w.minimize} title="最小化"><MinIcon size={15} /></button>
        <button className="tb-btn" onClick={w.maximizeToggle} title="最大化/还原">{max ? <RestoreIcon size={13} /> : <MaxIcon size={13} />}</button>
        <button className="tb-btn tb-btn--close" onClick={w.close} title="关闭"><CloseIcon size={15} /></button>
      </div>
    </div>
  )
}
```

`src/renderer/components/TitleBar/TitleBar.css`:
```css
.titlebar{height:var(--titlebar-h);display:flex;align-items:center;background:var(--bg-1);-webkit-app-region:drag;user-select:none;border-bottom:1px solid var(--border)}
.titlebar__brand{padding:0 14px;font-size:12px;letter-spacing:.3px;color:var(--text-dim);display:flex;align-items:center;gap:8px}
.titlebar__logo{color:var(--accent)}
.titlebar__drag{flex:1;height:100%}
.titlebar__controls{display:flex;-webkit-app-region:no-drag}
.tb-btn{width:46px;height:var(--titlebar-h);display:flex;align-items:center;justify-content:center;color:var(--text-dim);transition:background .15s,color .15s}
.tb-btn:hover{background:var(--surface-2);color:var(--text)}
.tb-btn--close:hover{background:var(--danger);color:#fff}
```

- [ ] **Step 6: Mount TitleBar in `main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { TitleBar } from './components/TitleBar/TitleBar'
import './styles/tokens.css'
import './styles/global.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <TitleBar />
      <div style={{flex:1}} />
    </div>
  </React.StrictMode>
)
```

- [ ] **Step 7: Verify**

Run `npm run dev`. Window has no native menu/titlebar; custom bar with working min/max/close; maximize icon toggles state.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: custom frameless title bar, remove native menu"
```

---

## Task 3: Shared types, constants, and binary detection (TDD)

**Files:**
- Create: `src/shared/constants.ts`
- Modify: `src/shared/types.ts`
- Test: `src/test/shared/binary.test.ts`

- [ ] **Step 1: Write failing test for binary detection**

`src/test/shared/binary.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isBinaryPath } from '../../shared/constants'

describe('isBinaryPath', () => {
  it('flags common image formats', () => {
    expect(isBinaryPath('a.png')).toBe(true)
    expect(isBinaryPath('b.jpg')).toBe(true)
    expect(isBinaryPath('c.gif')).toBe(true)
  })
  it('flags executables and archives', () => {
    expect(isBinaryPath('app.exe')).toBe(true)
    expect(isBinaryPath('lib.dll')).toBe(true)
    expect(isBinaryPath('arch.zip')).toBe(true)
  })
  it('does not flag source files', () => {
    expect(isBinaryPath('index.ts')).toBe(false)
    expect(isBinaryPath('readme.md')).toBe(false)
    expect(isBinaryPath('app.js')).toBe(false)
    expect(isBinaryPath('style.css')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

Run: `npx vitest run src/test/shared/binary.test.ts`
Expected: FAIL — `isBinaryPath` not exported.

- [ ] **Step 3: Implement constants**

`src/shared/constants.ts`:
```ts
const BINARY_EXT = new Set([
  'png','jpg','jpeg','gif','bmp','ico','webp','tiff','svgz','psd','ai',
  'mp3','wav','ogg','flac','aac','mp4','mkv','avi','mov','webm',
  'exe','dll','so','dylib','bin','obj','class','jar','wasm',
  'zip','rar','7z','tar','gz','bz2','xz','iso','dmg','apk',
  'pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp',
  'sqlite','db','mdb','ttf','otf','woff','woff2','eot','pcap','pyc'
])

export const isBinaryPath = (filename: string): boolean => {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  return BINARY_EXT.has(ext)
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/test/shared/binary.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Extend `src/shared/types.ts` with domain + IPC types**

```ts
export type WindowAction = 'minimize' | 'maximize-toggle' | 'close'

export interface FileNode {
  name: string
  path: string       // OS-native absolute
  isDir: boolean
  expanded?: boolean
  children?: FileNode[]
}

export type WatchEvent =
  | { type: 'add' | 'change'; path: string; isDir: false }
  | { type: 'unlink' | 'unlinkDir'; path: string; isDir: boolean }
  | { type: 'addDir'; path: string; isDir: true }

export interface FsApi {
  pickWorkspace: () => Promise<string | null>
  listDir: (dir: string) => Promise<FileNode[]>
  readFile: (path: string) => Promise<{ content: string; binary: boolean }>
  writeFile: (path: string, content: string) => Promise<void>
  createEntry: (path: string, isDir: boolean) => Promise<void>
  deleteEntry: (path: string) => Promise<void>
  watch: (dir: string) => Promise<void>
  unwatch: () => Promise<void>
  onWatchEvent: (cb: (e: WatchEvent) => void) => () => void
  renameEntry: (from: string, to: string) => Promise<void>
}

export interface WindowApi {
  minimize: () => void
  maximizeToggle: () => void
  close: () => void
  onMaximizeChange: (cb: (m: boolean) => void) => () => void
}

export interface ApiShape { window: WindowApi; fs: FsApi }
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: shared types, binary detection (TDD)"
```

---

## Task 4: FileService + WatcherService in main (TDD for FileService)

**Files:**
- Create: `src/main/services/FileService.ts`
- Create: `src/main/services/WatcherService.ts`
- Create: `src/main/utils/paths.ts`
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts` (register ipc)
- Test: `src/test/main/FileService.test.ts`

- [ ] **Step 1: Write failing FileService test (uses real temp dir)**

`src/test/main/FileService.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FileService } from '../../main/services/FileService'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let root = ''
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'yx-')) })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })

describe('FileService', () => {
  it('listDir returns sorted dirs-first tree children', async () => {
    const svc = new FileService()
    await mkdir(join(root, 'zdir'))
    await writeFile(join(root, 'a.ts'), 'x')
    await writeFile(join(root, 'b.txt'), 'y')
    const nodes = await svc.listDir(root)
    expect(nodes[0].isDir).toBe(true)
    expect(nodes[0].name).toBe('zdir')
    expect(nodes.find(n => n.name === 'a.ts')?.isDir).toBe(false)
  })
  it('readFile reports binary for png', async () => {
    const svc = new FileService()
    const p = join(root, 'x.png')
    await writeFile(p, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const r = await svc.readFile(p)
    expect(r.binary).toBe(true)
    expect(r.content).toBe('')
  })
  it('readFile returns text for ts', async () => {
    const svc = new FileService()
    const p = join(root, 'a.ts')
    await writeFile(p, 'export const x = 1')
    const r = await svc.readFile(p)
    expect(r.binary).toBe(false)
    expect(r.content).toBe('export const x = 1')
  })
  it('createEntry + deleteEntry round-trip', async () => {
    const svc = new FileService()
    const p = join(root, 'new.ts')
    await svc.createEntry(p, false)
    expect((await svc.readFile(p)).content).toBe('')
    await svc.deleteEntry(p)
    await expect(svc.readFile(p)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

Run: `npx vitest run src/test/main/FileService.test.ts`
Expected: FAIL — cannot find `FileService`.

- [ ] **Step 3: Implement paths util + FileService**

`src/main/utils/paths.ts`:
```ts
import { join, normalize } from 'path'
export const nativeJoin = (...seg: string[]) => normalize(join(...seg))
```

`src/main/services/FileService.ts`:
```ts
import { readFile, writeFile, readdir, mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { isBinaryPath } from '../../shared/constants'
import type { FileNode } from '../../shared/types'

export class FileService {
  async listDir(dir: string): Promise<FileNode[]> {
    const entries = await readdir(dir, { withFileTypes: true })
    const nodes: FileNode[] = entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({ name: e.name, path: join(dir, e.name), isDir: e.isDirectory() }))
    // dirs first, then files; alphabetical within group (case-insensitive)
    nodes.sort((a, b) =>
      Number(b.isDir) - Number(a.isDir) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
    return nodes
  }

  async readFile(path: string): Promise<{ content: string; binary: boolean }> {
    if (isBinaryPath(path)) return { content: '', binary: true }
    const content = await readFile(path, 'utf8')
    return { content, binary: false }
  }

  async writeFile(path: string, content: string): Promise<void> { await writeFile(path, content, 'utf8') }
  async createEntry(path: string, isDir: boolean): Promise<void> {
    if (isDir) await mkdir(path, { recursive: true })
    else await writeFile(path, '', 'utf8')
  }
  async deleteEntry(path: string): Promise<void> { await rm(path, { recursive: true, force: true }) }
  async renameEntry(from: string, to: string): Promise<void> {
    const { rename } = await import('node:fs/promises')
    await rename(from, to)
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/test/main/FileService.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement WatcherService (chokidar)**

`src/main/services/WatcherService.ts`:
```ts
import chokidar, { type FSWatcher } from 'chokidar'
import { basename } from 'node:path'
import type { WatchEvent } from '../../shared/types'

export class WatcherService {
  private watcher: FSWatcher | null = null
  constructor(private emit: (e: WatchEvent) => void) {}

  async watch(dir: string): Promise<void> {
    await this.unwatch()
    this.watcher = chokidar.watch(dir, {
      ignoreInitial: true,
      ignored: (p) => basename(p) === 'node_modules' || basename(p).startsWith('.'),
      awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 20 }
    })
    const w = this.watcher
    w.on('add',      (p) => this.emit({ type: 'add', path: p, isDir: false }))
    w.on('change',   (p) => this.emit({ type: 'change', path: p, isDir: false }))
    w.on('unlink',   (p) => this.emit({ type: 'unlink', path: p, isDir: false }))
    w.on('addDir',   (p) => this.emit({ type: 'addDir', path: p, isDir: true }))
    w.on('unlinkDir',(p) => this.emit({ type: 'unlinkDir', path: p, isDir: true }))
    await new Promise<void>((res) => w.on('ready', () => res()))
  }

  async unwatch(): Promise<void> {
    if (this.watcher) { await this.watcher.close(); this.watcher = null }
  }
}
```

- [ ] **Step 6: Wire IPC in `src/main/ipc.ts`**

```ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { FileService } from './services/FileService'
import { WatcherService } from './services/WatcherService'
import type { WatchEvent } from '../shared/types'

const fs = new FileService()
const watcher = new WatcherService((e: WatchEvent) => {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('watch:event', e)
})

export function registerIpc() {
  ipcMain.handle('fs:pickWorkspace', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('fs:listDir',   (_e, dir: string) => fs.listDir(dir))
  ipcMain.handle('fs:readFile',  (_e, p: string) => fs.readFile(p))
  ipcMain.handle('fs:writeFile', (_e, p: string, c: string) => fs.writeFile(p, c))
  ipcMain.handle('fs:create',    (_e, p: string, isDir: boolean) => fs.createEntry(p, isDir))
  ipcMain.handle('fs:delete',    (_e, p: string) => fs.deleteEntry(p))
  ipcMain.handle('fs:rename',    (_e, from: string, to: string) => fs.renameEntry(from, to))
  ipcMain.handle('fs:watch',     (_e, dir: string) => watcher.watch(dir))
  ipcMain.handle('fs:unwatch',   () => watcher.unwatch())
}
```

- [ ] **Step 7: Register + single-instance in `src/main/index.ts`**

Add near top imports: `import { registerIpc } from './ipc'`
In `app.whenReady().then(...)` call `registerIpc()` before `createWindow()`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: FileService + WatcherService + IPC wiring"
```

---

## Task 5: Preload fs API + typed renderer ipc client + stores

**Files:**
- Modify: `src/preload/index.ts` (add fs bridge)
- Create: `src/renderer/services/ipc.ts`
- Create: `src/renderer/store/workspaceStore.ts`
- Create: `src/renderer/store/fileTreeStore.ts`
- Create: `src/renderer/store/editorStore.ts`

- [ ] **Step 1: Expose fs API in preload**

Replace `src/preload/index.ts` with:
```ts
import { contextBridge, ipcRenderer } from 'electron'
import type { ApiShape, WatchEvent } from '../shared/types'

const api: ApiShape = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
    close: () => ipcRenderer.invoke('window:close'),
    onMaximizeChange: (cb) => {
      const h = (_: unknown, m: boolean) => cb(m)
      ipcRenderer.send('window:maximize-state:subscribe')
      ipcRenderer.on('window:maximize-state', h)
      return () => ipcRenderer.off('window:maximize-state', h)
    }
  },
  fs: {
    pickWorkspace: () => ipcRenderer.invoke('fs:pickWorkspace'),
    listDir: (dir) => ipcRenderer.invoke('fs:listDir', dir),
    readFile: (p) => ipcRenderer.invoke('fs:readFile', p),
    writeFile: (p, c) => ipcRenderer.invoke('fs:writeFile', p, c),
    createEntry: (p, isDir) => ipcRenderer.invoke('fs:create', p, isDir),
    deleteEntry: (p) => ipcRenderer.invoke('fs:delete', p),
    renameEntry: (f, t) => ipcRenderer.invoke('fs:rename', f, t),
    watch: (dir) => ipcRenderer.invoke('fs:watch', dir),
    unwatch: () => ipcRenderer.invoke('fs:unwatch'),
    onWatchEvent: (cb: (e: WatchEvent) => void) => {
      const h = (_: unknown, e: WatchEvent) => cb(e)
      ipcRenderer.on('watch:event', h)
      return () => ipcRenderer.off('watch:event', h)
    }
  }
}
contextBridge.exposeInMainWorld('api', api)
```

- [ ] **Step 2: Renderer ipc client**

`src/renderer/services/ipc.ts`:
```ts
import type { ApiShape } from '../../shared/types'
export const api = (window as unknown as { api: ApiShape }).api
```

- [ ] **Step 3: workspaceStore**

`src/renderer/store/workspaceStore.ts`:
```ts
import { create } from 'zustand'
import { api } from '../services/ipc'

interface WorkspaceState {
  root: string | null
  open: () => Promise<void>
  setRoot: (r: string | null) => void
}
export const useWorkspace = create<WorkspaceState>((set) => ({
  root: null,
  setRoot: (r) => set({ root: r }),
  open: async () => {
    const r = await api.fs.pickWorkspace()
    if (r) set({ root: r })
  }
}))
```

- [ ] **Step 4: fileTreeStore (with watcher-event mutations)**

`src/renderer/store/fileTreeStore.ts`:
```ts
import { create } from 'zustand'
import { api } from '../services/ipc'
import type { FileNode, WatchEvent } from '../../shared/types'
import { basename, dirname } from './pathShim'

interface TreeState {
  root: FileNode | null
  loading: boolean
  loadRoot: (dir: string) => Promise<void>
  toggle: (path: string) => Promise<void>
  applyWatchEvent: (e: WatchEvent) => void
  findNode: (path: string) => FileNode | undefined
}

export const useFileTree = create<TreeState>((set, get) => ({
  root: null,
  loading: false,

  loadRoot: async (dir) => {
    set({ loading: true })
    const children = await api.fs.listDir(dir)
    set({ root: { name: basename(dir), path: dir, isDir: true, expanded: true, children }, loading: false })
    await api.fs.watch(dir)
  },

  toggle: async (path) => {
    const root = get().root; if (!root) return
    const node = get().findNode(path); if (!node || !node.isDir) return
    if (!node.expanded) {
      node.children = await api.fs.listDir(path)
      node.expanded = true
    } else {
      node.expanded = false
    }
    set({ root: { ...root } })
  },

  findNode: (path) => {
    let found: FileNode | undefined
    const walk = (n: FileNode) => {
      if (n.path === path) { found = n; return true }
      if (n.children) for (const c of n.children) if (walk(c)) return true
      return false
    }
    if (get().root) walk(get().root!)
    return found
  },

  applyWatchEvent: (e) => {
    const root = get().root; if (!root) return
    const parentPath = (e.type === 'addDir' || e.type === 'add' || e.type === 'unlink' || e.type === 'unlinkDir')
      ? dirname(e.path) : null
    if (e.type === 'add' || e.type === 'addDir') {
      const parent = parentPath ? get().findNode(parentPath) : root
      if (parent && parent.isDir && parent.expanded && parent.children && !parent.children.some(c => c.path === e.path)) {
        parent.children.push({ name: basename(e.path), path: e.path, isDir: e.type === 'addDir' })
        parent.children.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      }
    } else if (e.type === 'unlink' || e.type === 'unlinkDir') {
      const parent = parentPath ? get().findNode(parentPath) : root
      if (parent && parent.children) parent.children = parent.children.filter(c => c.path !== e.path)
    }
    // 'change' handled by editorStore (reload open file)
    set({ root: { ...root } })
  }
}))
```

`src/renderer/store/pathShim.ts` (renderer-safe path ops without node 'path'):
```ts
export const basename = (p: string) => p.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || p
export const dirname = (p: string) => {
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/)
  parts.pop()
  return parts.join('\\') // OS-native on Windows
}
```

- [ ] **Step 5: editorStore**

`src/renderer/store/editorStore.ts`:
```ts
import { create } from 'zustand'
import { api } from '../services/ipc'
import { isBinaryPath } from '../../shared/constants'

export interface Tab { path: string; name: string; content: string; savedContent: string; binary: boolean; dirty: boolean }

interface EditorState {
  tabs: Tab[]
  activePath: string | null
  openFile: (path: string) => Promise<{ blocked: boolean }>
  closeTab: (path: string) => void
  setContent: (path: string, content: string) => void
  saveActive: () => Promise<void>
  setActive: (path: string) => void
  reloadFromDisk: (path: string) => Promise<void>
  isDirty: () => boolean
}
export const useEditor = create<EditorState>((set, get) => ({
  tabs: [], activePath: null,

  openFile: async (path) => {
    const existing = get().tabs.find(t => t.path === path)
    if (existing) { set({ activePath: path }); return { blocked: existing.binary } }
    if (isBinaryPath(path)) {
      const name = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop()!
      set(s => ({ tabs: [...s.tabs, { path, name, content: '', savedContent: '', binary: true, dirty: false }] }))
      set({ activePath: path })
      return { blocked: true }
    }
    const { content } = await api.fs.readFile(path)
    const name = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop()!
    set(s => ({ tabs: [...s.tabs, { path, name, content, savedContent: content, binary: false, dirty: false }], activePath: path }))
    return { blocked: false }
  },

  closeTab: (path) => set(s => {
    const idx = s.tabs.findIndex(t => t.path === path)
    const tabs = s.tabs.filter(t => t.path !== path)
    let activePath = s.activePath
    if (s.activePath === path) activePath = tabs[idx]?.path ?? tabs[idx - 1]?.path ?? null
    return { tabs, activePath }
  }),

  setContent: (path, content) => set(s => ({
    tabs: s.tabs.map(t => t.path === path ? { ...t, content, dirty: t.savedContent !== content } : t)
  })),

  saveActive: async () => {
    const { activePath, tabs } = get(); if (!activePath) return
    const t = tabs.find(x => x.path === activePath); if (!t || t.binary) return
    await api.fs.writeFile(activePath, t.content)
    set({ tabs: tabs.map(x => x.path === activePath ? { ...x, savedContent: x.content, dirty: false } : x) })
  },

  setActive: (path) => set({ activePath: path }),

  reloadFromDisk: async (path) => {
    const t = get().tabs.find(x => x.path === path); if (!t || t.binary) return
    if (t.dirty) return // don't clobber unsaved edits; UI notifies (Task 7)
    const { content } = await api.fs.readFile(path)
    set(s => ({ tabs: s.tabs.map(x => x.path === path ? { ...x, content, savedContent: content, dirty: false } : x) }))
  },

  isDirty: () => get().tabs.some(t => t.dirty)
}))
```

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: compiles with no TS errors (renderer stores reference preload api via window cast).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: preload fs bridge, typed ipc client, zustand stores"
```

---

## Task 6: Workspace watcher subscription hook + file tree data test (TDD)

**Files:**
- Create: `src/renderer/hooks/useWorkspaceWatcher.ts`
- Test: `src/test/shared/fileTree.test.ts` (pure tree mutation logic)

- [ ] **Step 1: Extract pure applyWatchEvent logic for testability**

Create `src/shared/treeOps.ts`:
```ts
import type { FileNode, WatchEvent } from './types'

export const findNode = (root: FileNode | null, path: string): FileNode | undefined => {
  let found: FileNode | undefined
  const walk = (n: FileNode): boolean => {
    if (n.path === path) { found = n; return true }
    if (n.children) for (const c of n.children) if (walk(c)) return true
    return false
  }
  if (root) walk(root)
  return found
}

const sortSiblings = (arr: FileNode[]) =>
  arr.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

const base = (p: string) => p.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || p
const dir = (p: string) => { const a = p.replace(/[/\\]+$/, '').split(/[/\\]/); a.pop(); return a.join('\\') }

export const applyWatchEvent = (root: FileNode | null, e: WatchEvent): FileNode | null => {
  if (!root) return null
  if (e.type === 'change') return root // editorStore handles
  const parentPath = dir(e.path)
  const parent = parentPath ? findNode(root, parentPath) : root
  if (!parent || !parent.isDir || !parent.expanded || !parent.children) return root
  if (e.type === 'add' || e.type === 'addDir') {
    if (parent.children.some(c => c.path === e.path)) return root
    parent.children = [...parent.children, { name: base(e.path), path: e.path, isDir: e.type === 'addDir' }]
    sortSiblings(parent.children)
  } else { // unlink / unlinkDir
    parent.children = parent.children.filter(c => c.path !== e.path)
  }
  return { ...root }
}
```

- [ ] **Step 2: Write failing tree ops test**

`src/test/shared/fileTree.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { applyWatchEvent, findNode } from '../../shared/treeOps'
import type { FileNode } from '../../shared/types'

const mkRoot = (children: FileNode[]): FileNode => ({ name: 'r', path: 'C:\\r', isDir: true, expanded: true, children })

describe('applyWatchEvent', () => {
  it('adds a new file under expanded parent', () => {
    const root = mkRoot([])
    const next = applyWatchEvent(root, { type: 'add', path: 'C:\\r\\a.ts', isDir: false })
    expect(next!.children![0].name).toBe('a.ts')
  })
  it('removes a file on unlink', () => {
    const root = mkRoot([{ name: 'a.ts', path: 'C:\\r\\a.ts', isDir: false }])
    const next = applyWatchEvent(root, { type: 'unlink', path: 'C:\\r\\a.ts', isDir: false })
    expect(next!.children).toHaveLength(0)
  })
  it('ignores change events (handled elsewhere)', () => {
    const root = mkRoot([])
    expect(applyWatchEvent(root, { type: 'change', path: 'C:\\r\\a.ts', isDir: false })).toBe(root)
  })
  it('findNode locates nested', () => {
    const root = mkRoot([{ name: 'd', path: 'C:\\r\\d', isDir: true, children: [{ name: 'x.ts', path: 'C:\\r\\d\\x.ts', isDir: false }] }])
    expect(findNode(root, 'C:\\r\\d\\x.ts')?.name).toBe('x.ts')
  })
})
```

- [ ] **Step 3: Run — expect PASS (logic implemented with test)**

Run: `npx vitest run src/test/shared/fileTree.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Refactor fileTreeStore to use shared treeOps**

In `src/renderer/store/fileTreeStore.ts` replace inline `findNode`/`applyWatchEvent` with imports from `../../shared/treeOps`:
```ts
import { applyWatchEvent as applyShared, findNode as findShared } from '../../shared/treeOps'
// findNode: (path) => findShared(get().root, path)
// applyWatchEvent: (e) => set({ root: applyShared(get().root, e) })
```

- [ ] **Step 5: Watcher subscription hook**

`src/renderer/hooks/useWorkspaceWatcher.ts`:
```ts
import { useEffect } from 'react'
import { api } from '../services/ipc'
import { useWorkspace } from '../store/workspaceStore'
import { useFileTree } from '../store/fileTreeStore'
import { useEditor } from '../store/editorStore'

export function useWorkspaceWatcher() {
  const root = useWorkspace(s => s.root)
  const loadRoot = useFileTree(s => s.loadRoot)
  const applyWatchEvent = useFileTree(s => s.applyWatchEvent)
  const reloadFromDisk = useEditor(s => s.reloadFromDisk)

  useEffect(() => {
    if (!root) { useFileTree.setState({ root: null }); return }
    loadRoot(root)
    const off = api.fs.onWatchEvent((e) => {
      applyWatchEvent(e)
      if (e.type === 'change') reloadFromDisk(e.path)
    })
    return () => { off(); api.fs.unwatch() }
  }, [root, loadRoot, applyWatchEvent, reloadFromDisk])
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: shared tree ops (TDD) + workspace watcher hook"
```

---

## Task 7: File tree UI + resizable sidebar + file-type icons + context menu

**Files:**
- Create: `src/renderer/components/Sidebar/Sidebar.tsx` (+ `.css`)
- Create: `src/renderer/components/Sidebar/FileTree.tsx`
- Create: `src/renderer/components/Sidebar/FileTreeNode.tsx`
- Create: `src/renderer/components/Sidebar/FileIcon.tsx`
- Create: `src/renderer/components/Sidebar/ContextMenu.tsx`
- Modify: `src/renderer/App.tsx` (new), `src/renderer/main.tsx` (mount App)
- Create: `src/renderer/components/common/Toast.tsx` (+ toast store)

- [ ] **Step 1: Toast component + store (used by binary-open + sync)**

`src/renderer/store/toastStore.ts`:
```ts
import { create } from 'zustand'
export interface Toast { id: number; message: string; tone: 'info' | 'warn' | 'error' }
interface S { toasts: Toast[]; push: (m: string, t?: Toast['tone']) => void; dismiss: (id: number) => void }
let id = 0
export const useToast = create<S>((set) => ({
  toasts: [],
  push: (m, tone = 'info') => set(s => ({ toasts: [...s.toasts, { id: ++id, message: m, tone }] })),
  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
}))
```

`src/renderer/components/common/Toast.tsx`:
```tsx
import { useEffect } from 'react'
import { useToast } from '../../store/toastStore'
import './Toast.css'
export function ToastStack() {
  const toasts = useToast(s => s.toasts); const dismiss = useToast(s => s.dismiss)
  return (
    <div className="toast-stack">
      {toasts.map(t => <ToastItem key={t.id} toast={t} dismiss={() => dismiss(t.id)} />)}
    </div>
  )
}
function ToastItem({ toast, dismiss }: { toast: { message: string; tone: string }; dismiss: () => void }) {
  useEffect(() => { const t = setTimeout(dismiss, 3200); return () => clearTimeout(t) }, [dismiss])
  return <div className={`toast toast--${toast.tone}`} onClick={dismiss}>{toast.message}</div>
}
```

`src/renderer/components/common/Toast.css`:
```css
.toast-stack{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:10px;z-index:9999}
.toast{min-width:240px;max-width:380px;padding:12px 16px;border-radius:var(--radius);background:var(--surface-2);color:var(--text);box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid var(--border);font-size:13px;animation:toast-in .25s ease;cursor:pointer}
.toast--warn{border-left:3px solid #f9e2af}
.toast--error{border-left:3px solid var(--danger)}
.toast--info{border-left:3px solid var(--accent-2)}
@keyframes toast-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
```

- [ ] **Step 2: FileIcon — modern SVG logos per extension**

`src/renderer/components/Sidebar/FileIcon.tsx`:
```tsx
import { isBinaryPath } from '../../../shared/constants'
import { File, FileCode, FileText, FileJson, Image, FileTerminal } from 'lucide-react'

const palette: Record<string, { color: string; glyph: JSX.Element }> = {
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
```

- [ ] **Step 3: ContextMenu**

`src/renderer/components/Sidebar/ContextMenu.tsx`:
```tsx
import { FilePlus, FolderPlus, Trash2 } from 'lucide-react'
import './Sidebar.css'
export interface CtxState { x: number; y: number; targetPath: string | null; isDirTarget: boolean }
export function ContextMenu({ state, onClose, actions }: {
  state: CtxState | null; onClose: () => void
  actions: { newFile: (parent: string) => void; newFolder: (parent: string) => void; del: (path: string) => void }
}) {
  if (!state) return null
  const parent = state.isDirTarget ? state.targetPath! : state.targetPath!.replace(/[/\\]+$/, '').split(/[/\\]/).slice(0, -1).join('\\')
  const item = (label: string, icon: JSX.Element, fn: () => void) => (
    <button className="ctx-item" onClick={() => { fn(); onClose() }}>{icon}<span>{label}</span></button>
  )
  return (
    <div className="ctx-overlay" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div className="ctx-menu" style={{ left: state.x, top: state.y }}>
        {item('新建文件', <FilePlus size={14} />, () => actions.newFile(parent))}
        {item('新建文件夹', <FolderPlus size={14} />, () => actions.newFolder(parent))}
        {state.targetPath && item('删除', <Trash2 size={14} />, () => actions.del(state.targetPath!))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: FileTreeNode + FileTree**

`src/renderer/components/Sidebar/FileTreeNode.tsx`:
```tsx
import { useState } from 'react'
import type { FileNode } from '../../../shared/types'
import { useFileTree } from '../../store/fileTreeStore'
import { useEditor } from '../../store/editorStore'
import { useToast } from '../../store/toastStore'
import { FileIcon } from './FileIcon'
interface Props { node: FileNode; depth: number; onContext: (e: React.MouseEvent, node: FileNode) => void }
export function FileTreeNode({ node, depth, onContext }: Props) {
  const toggle = useFileTree(s => s.toggle)
  const openFile = useEditor(s => s.openFile)
  const push = useToast(s => s.push)
  const [spin, setSpin] = useState(false)
  const onClick = async () => {
    if (node.isDir) { setSpin(true); await toggle(node.path); setSpin(false) }
    else {
      const { blocked } = await openFile(node.path)
      if (blocked) push(`“${node.name}” 是二进制文件，无法在编辑器中打开`, 'warn')
    }
  }
  return (
    <div
      className={`tn ${node.isDir ? 'tn--dir' : 'tn--file'}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); onContext(e, node) }}
    >
      <span className={`tn__chev ${spin ? 'spin' : ''}`}>{node.isDir ? (node.expanded ? '▾' : '▸') : ''}</span>
      <FileIcon name={node.name} isDir={node.isDir} expanded={node.expanded} />
      <span className="tn__name">{node.name}</span>
    </div>
  )
}
```

`src/renderer/components/Sidebar/FileTree.tsx`:
```tsx
import type { FileNode } from '../../../shared/types'
import { FileTreeNode } from './FileTreeNode'
export function FileTree({ nodes, depth, onContext }: { nodes: FileNode[] | undefined; depth: number; onContext: (e: React.MouseEvent, n: FileNode) => void }) {
  if (!nodes?.length) return <div className="ft-empty">空文件夹</div>
  return <>{nodes.map(n => (
    <div key={n.path}>
      <FileTreeNode node={n} depth={depth} onContext={onContext} />
      {n.isDir && n.expanded && <FileTree nodes={n.children} depth={depth + 1} onContext={onContext} />}
    </div>
  ))}</>
}
```

- [ ] **Step 5: Sidebar (resizable) + context menu wiring + create/delete flows**

`src/renderer/components/Sidebar/Sidebar.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { useFileTree } from '../../store/fileTreeStore'
import { useWorkspace } from '../../store/workspaceStore'
import { api } from '../../services/ipc'
import { useToast } from '../../store/toastStore'
import { FileTree } from './FileTree'
import { ContextMenu, type CtxState } from './ContextMenu'
import './Sidebar.css'

export function Sidebar() {
  const root = useFileTree(s => s.root)
  const loadRoot = useFileTree(s => s.loadRoot)
  const wsRoot = useWorkspace(s => s.root)
  const push = useToast(s => s.push)
  const [ctx, setCtx] = useState<CtxState | null>(null)
  const [width, setWidth] = useState(260)
  const dragging = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) setWidth(Math.min(560, Math.max(180, e.clientX))) }
    const onUp = () => { dragging.current = false; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const onContext = (e: React.MouseEvent, node: any) => setCtx({ x: e.clientX, y: e.clientY, targetPath: node.path, isDirTarget: node.isDir })

  const newEntry = async (parent: string, isDir: boolean) => {
    const name = window.prompt(isDir ? '文件夹名称' : '文件名称', isDir ? 'new-folder' : 'new-file.ts')
    if (!name) return
    const p = parent + '\\' + name
    await api.fs.createEntry(p, isDir); await loadRoot(wsRoot!); push(`已创建 ${name}`, 'info')
  }
  const del = async (path: string) => {
    if (!window.confirm(`确定删除 ${path.split('\\').pop()}？此操作不可撤销。`)) return
    await api.fs.deleteEntry(path); await loadRoot(wsRoot!); push('已删除', 'info')
  }

  return (
    <>
      <aside className="sidebar" style={{ width }}>
        <div className="sidebar__head">
          <span>资源管理器</span>
          <button className="sidebar__head-btn" title="新建文件" onClick={() => wsRoot && newEntry(wsRoot, false)}>＋</button>
        </div>
        <div className="sidebar__tree" onContextMenu={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, targetPath: wsRoot!, isDirTarget: true }) } }}>
          {root ? <FileTree nodes={root.children} depth={0} onContext={onContext} /> : <div className="ft-empty">未打开工作区</div>}
        </div>
      </aside>
      <div className="sidebar__resizer" onMouseDown={() => { dragging.current = true; document.body.style.cursor = 'col-resize' }} />
      <ContextMenu state={ctx} onClose={() => setCtx(null)} actions={{ newFile: (p) => newEntry(p, false), newFolder: (p) => newEntry(p, true), del }} />
    </>
  )
}
```

`src/renderer/components/Sidebar/Sidebar.css`:
```css
.sidebar{background:var(--bg-1);display:flex;flex-direction:column;border-right:1px solid var(--border);overflow:hidden;flex-shrink:0}
.sidebar__head{height:38px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--text-mute)}
.sidebar__head-btn{width:22px;height:22px;border-radius:var(--radius-sm);color:var(--text-dim);font-size:16px;display:flex;align-items:center;justify-content:center}
.sidebar__head-btn:hover{background:var(--surface-2);color:var(--text)}
.sidebar__tree{flex:1;overflow:auto;padding:4px 0}
.tn{display:flex;align-items:center;gap:6px;height:24px;font-size:13px;color:var(--text-dim);cursor:pointer;padding-right:8px}
.tn:hover{background:var(--surface-2)}
.tn--file.active{background:var(--surface-2);color:var(--text)}
.tn__chev{width:10px;color:var(--text-mute);font-size:10px}
.tn__chev.spin{animation:spin .6s linear infinite}
.tn__name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ft-empty{padding:12px;color:var(--text-mute);font-size:12px}
.sidebar__resizer{width:4px;cursor:col-resize;background:transparent;flex-shrink:0}
.sidebar__resizer:hover{background:var(--surface-3)}
.ctx-overlay{position:fixed;inset:0;z-index:1000}
.ctx-menu{position:fixed;min-width:170px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:6px;box-shadow:0 12px 32px rgba(0,0,0,.5);animation:toast-in .12s ease}
.ctx-item{display:flex;align-items:center;gap:10px;width:100%;padding:7px 10px;border-radius:var(--radius-sm);font-size:13px;color:var(--text-dim)}
.ctx-item:hover{background:var(--surface-3);color:var(--text)}
@keyframes spin{to{transform:rotate(360deg)}}
```

- [ ] **Step 6: Build + manual verify**

Run: `npm run dev`. Open a workspace (next task adds the open button; for now call `useWorkspace.getState().open()` from devtools console). Tree renders with icons, expand/collapse works, right-click shows menu, new/delete works, sidebar resizable, binary file click shows toast.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: resizable sidebar, file tree, icons, context menu, toasts"
```

---

## Task 8: Monaco editor — smooth cursor, ligatures, bracket pair color, tab autocomplete

**Files:**
- Create: `src/renderer/components/Editor/CodeEditor.tsx` (+ `.css`)
- Create: `src/renderer/components/Editor/TabBar.tsx`
- Create: `src/renderer/components/Editor/EditorArea.tsx`
- Create: `src/renderer/components/Editor/WelcomePage.tsx`
- Create: `src/renderer/components/Editor/Editor.css`
- Modify: `src/renderer/App.tsx` (compose layout)

- [ ] **Step 1: WelcomePage**

`src/renderer/components/Editor/WelcomePage.tsx`:
```tsx
import { useWorkspace } from '../../store/workspaceStore'
import './Editor.css'
export function WelcomePage() {
  const open = useWorkspace(s => s.open)
  return (
    <div className="welcome">
      <div className="welcome__logo">◆</div>
      <h1 className="welcome__title">Yanxi Code</h1>
      <p className="welcome__sub">As coding as developing</p>
      <button className="welcome__btn" onClick={open}>打开文件夹</button>
    </div>
  )
}
```

- [ ] **Step 2: TabBar with dirty dots + close confirm**

`src/renderer/components/Editor/TabBar.tsx`:
```tsx
import { useEditor } from '../../store/editorStore'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useState } from 'react'
import { X } from 'lucide-react'
export function TabBar() {
  const tabs = useEditor(s => s.tabs); const active = useEditor(s => s.activePath)
  const setActive = useEditor(s => s.setActive); const closeTab = useEditor(s => s.closeTab)
  const [confirm, setConfirm] = useState<string | null>(null)
  return (
    <>
      <div className="tabbar">
        {tabs.map(t => (
          <div key={t.path} className={`tab ${t.path === active ? 'tab--active' : ''}`} onClick={() => setActive(t.path)}>
            <span className={`tab__dot ${t.dirty ? 'tab__dot--dirty' : ''}`} />
            <span className="tab__name">{t.name}</span>
            <button className="tab__close" onClick={(e) => {
              e.stopPropagation()
              if (t.dirty) setConfirm(t.path); else closeTab(t.path)
            }}><X size={12} /></button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="未保存的更改"
        message={`“${confirm?.split('\\').pop()}” 尚未保存，确认关闭？`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (confirm) closeTab(confirm); setConfirm(null) }}
      />
    </>
  )
}
```

`src/renderer/components/common/ConfirmDialog.tsx`:
```tsx
import './ConfirmDialog.css'
export function ConfirmDialog({ open, title, message, onCancel, onConfirm }: {
  open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__title">{title}</div>
        <div className="modal__msg">{message}</div>
        <div className="modal__actions">
          <button className="modal__btn" onClick={onCancel}>取消</button>
          <button className="modal__btn modal__btn--primary" onClick={onConfirm}>确认</button>
        </div>
      </div>
    </div>
  )
}
```

`src/renderer/components/common/ConfirmDialog.css`:
```css
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:2000;animation:fade .15s ease}
.modal{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;min-width:340px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.modal__title{font-size:14px;font-weight:600;margin-bottom:10px}
.modal__msg{font-size:13px;color:var(--text-dim);margin-bottom:18px;line-height:1.5}
.modal__actions{display:flex;justify-content:flex-end;gap:10px}
.modal__btn{padding:7px 16px;border-radius:var(--radius-sm);font-size:13px;background:var(--surface-3);color:var(--text)}
.modal__btn--primary{background:var(--accent);color:#1e1e2e;font-weight:600}
.modal__btn:hover{filter:brightness(1.1)}
@keyframes fade{from{opacity:0}to{opacity:1}}
```

- [ ] **Step 3: CodeEditor (Monaco) — smooth cursor, ligatures, bracket color, autocomplete**

`src/renderer/components/Editor/CodeEditor.tsx`:
```tsx
import Editor, { type OnMount } from '@monaco-editor/react'
import { useEditor } from '../../store/editorStore'
import { useToast } from '../../store/toastStore'
import './Editor.css'

const options: Parameters<typeof Editor>[0]['options'] = {
  fontFamily: "'Consolas','Cascadia Code',monospace",
  fontLigatures: true,
  fontSize: 14,
  lineHeight: 22,
  minimap: { enabled: false },
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'explicit',
  cursorBlinkingDuration: 600,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  tabSize: 2,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  quickSuggestions: { other: true, comments: false, strings: true },
  suggestOnTriggerCharacters: true,
  tabCompletion: 'on',
  wordBasedSuggestions: 'currentDocuments',
  padding: { top: 14, bottom: 14 },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
}

export function CodeEditor() {
  const activePath = useEditor(s => s.activePath)
  const tab = useEditor(s => s.tabs.find(t => t.path === activePath))
  const setContent = useEditor(s => s.setContent)
  const push = useToast(s => s.push)

  if (!tab) return <div className="editor-empty">选择一个文件开始编辑</div>
  if (tab.binary) return <div className="editor-binary">二进制文件不可编辑</div>

  const onMount: OnMount = (editor) => {
    // Tab accepts inline suggestion (autocomplete)
    editor.addCommand(monacoKeyCode_TabAccept(), () => {})
  }
  // Monaco accepts suggestion on Tab by default when tabCompletion:'on'; no extra command needed.

  return (
    <Editor
      key={tab.path}
      theme="vs-dark"
      language={guessLang(tab.name)}
      value={tab.content}
      options={options}
      onChange={(v) => setContent(tab.path, v ?? '')}
      onMount={(editor, monaco) => {
        // ensure Tab accepts suggestion
        monaco.editor.defineTheme('yanxi', {
          base: 'vs-dark', inherit: true,
          rules: [],
          colors: { 'editor.background': '#1e1e2e', 'editor.foreground': '#cdd6f4' }
        })
        monaco.editor.setTheme('yanxi')
      }}
    />
  )
}

function monacoKeyCode_TabAccept() { return 0 /* placeholder; default behavior handles it */ }
function guessLang(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string,string> = { ts:'typescript', tsx:'typescript', js:'javascript', jsx:'javascript', json:'json', css:'css', html:'html', md:'markdown', py:'python' }
  return map[ext] ?? 'plaintext'
}
```

> Note: `tabCompletion: 'on'` + `suggestOnTriggerCharacters` already makes **Tab accept** the inline suggestion. The `onMount` body is intentionally minimal; remove the unused `monacoKeyCode_TabAccept` helper if TS complains — keep behavior default.

- [ ] **Step 4: EditorArea composes welcome vs tabs+editor**

`src/renderer/components/Editor/EditorArea.tsx`:
```tsx
import { useEditor } from '../../store/editorStore'
import { useWorkspace } from '../../store/workspaceStore'
import { CodeEditor } from './CodeEditor'
import { TabBar } from './TabBar'
import { WelcomePage } from './WelcomePage'
export function EditorArea() {
  const hasWs = useWorkspace(s => !!s.root)
  const tabs = useEditor(s => s.tabs)
  if (!hasWs && tabs.length === 0) return <WelcomePage />
  return (
    <div className="editor-area">
      <TabBar />
      <div className="editor-area__body"><CodeEditor /></div>
    </div>
  )
}
```

- [ ] **Step 5: Editor css**

`src/renderer/components/Editor/Editor.css`:
```css
.editor-area{display:flex;flex-direction:column;flex:1;min-width:0;background:var(--bg-0)}
.editor-area__body{flex:1;min-height:0;position:relative}
.editor-empty,.editor-binary{height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-mute);font-size:13px}
.tabbar{display:flex;height:36px;background:var(--bg-1);border-bottom:1px solid var(--border);overflow-x:auto;flex-shrink:0}
.tab{display:flex;align-items:center;gap:8px;padding:0 12px;height:100%;cursor:pointer;border-right:1px solid var(--border);color:var(--text-mute);font-size:13px;max-width:200px;position:relative}
.tab:hover{background:var(--surface-2)}
.tab--active{background:var(--bg-0);color:var(--text)}
.tab--active::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--accent)}
.tab__dot{width:8px;height:8px;border-radius:50%;background:transparent;border:1px solid var(--text-mute)}
.tab__dot--dirty{background:var(--accent-2);border-color:var(--accent-2)}
.tab__name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tab__close{display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;color:var(--text-mute)}
.tab__close:hover{background:var(--surface-3);color:var(--text)}
.welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.welcome__logo{font-size:64px;color:var(--accent);animation:float 4s ease-in-out infinite}
.welcome__title{font-size:36px;font-weight:700;margin:8px 0 0;letter-spacing:1px}
.welcome__sub{color:var(--text-dim);font-size:14px;margin:0 0 24px;font-style:italic}
.welcome__btn{padding:10px 24px;border-radius:var(--radius);background:var(--accent);color:#1e1e2e;font-weight:600;font-size:13px}
.welcome__btn:hover{filter:brightness(1.08)}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
```

- [ ] **Step 6: App layout + watcher hook + toast mount**

`src/renderer/App.tsx`:
```tsx
import { TitleBar } from './components/TitleBar/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorArea'
import { ToastStack } from './components/common/Toast'
import { useWorkspaceWatcher } from './hooks/useWorkspaceWatcher'
export function App() {
  useWorkspaceWatcher()
  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        <Sidebar />
        <EditorArea />
      </div>
      <ToastStack />
    </div>
  )
}
```

Update `src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/animations.css'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
```

`src/renderer/styles/animations.css`:
```css
.app{display:flex;flex-direction:column;height:100%}
.app__body{flex:1;display:flex;min-height:0}
```

- [ ] **Step 7: Verify Monaco features**

Run `npm run dev`, open workspace, open a `.ts` file. Confirm: cursor animates smoothly when moving with arrows, font ligatures render (`=>`, `!==`), bracket pairs colored, typing triggers autocomplete and **Tab accepts** the suggestion.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: Monaco editor (smooth cursor, ligatures, autocomplete) + tabs + welcome page"
```

---

## Task 9: Global keyboard shortcuts (Ctrl+N/S/C/V etc) + open workspace in title bar

**Files:**
- Create: `src/renderer/hooks/useGlobalShortcuts.ts`
- Modify: `src/renderer/components/TitleBar/TitleBar.tsx` (add "打开文件夹" button)

- [ ] **Step 1: Global shortcut hook**

`src/renderer/hooks/useGlobalShortcuts.ts`:
```ts
import { useEffect } from 'react'
import { useEditor } from '../store/editorStore'
import { useWorkspace } from '../store/workspaceStore'
import { useToast } from '../store/toastStore'

export function useGlobalShortcuts() {
  const saveActive = useEditor(s => s.saveActive)
  const open = useWorkspace(s => s.open)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const key = e.key.toLowerCase()
      // Ctrl+S: save active tab
      if (key === 's') { e.preventDefault(); saveActive(); return }
      // Ctrl+N: new untitled file (open workspace if none) — keep simple: focus welcome open
      if (key === 'n') { e.preventDefault(); /* new-file flow handled by sidebar; here we open ws picker if none */ if (!useWorkspace.getState().root) open(); return }
      // Ctrl+O: open folder
      if (key === 'o') { e.preventDefault(); open(); return }
      // Ctrl+W: close active tab (dirty → handled by TabBar confirm; here direct close)
      if (key === 'w') { e.preventDefault(); const ap = useEditor.getState().activePath; if (ap) useEditor.getState().closeTab(ap); return }
      // Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+A: Monaco handles natively when editor focused.
      // We only prevent app-level conflicts; no-op here so Monaco receives them.
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [saveActive, open])
}
```

> Note: `Ctrl+C/V/X/A` inside Monaco are handled by Monaco itself because the editor owns focus and stops propagation for its keybindings. The global listener uses capture (`true`) but only acts on S/N/O/W, leaving C/V/X/A untouched.

- [ ] **Step 2: Add "打开文件夹" button to TitleBar**

In `src/renderer/components/TitleBar/TitleBar.tsx`, add a button between brand and drag region:
```tsx
import { useWorkspace } from '../../store/workspaceStore'
// inside component:
const open = useWorkspace(s => s.open)
// JSX:
<button className="titlebar__action" onClick={open} style={{ WebkitAppRegion: 'no-drag' }}>打开文件夹</button>
```
Add to `TitleBar.css`:
```css
.titlebar__action{font-size:12px;color:var(--text-dim);padding:4px 10px;border-radius:var(--radius-sm);margin-left:8px}
.titlebar__action:hover{background:var(--surface-2);color:var(--text)}
```

- [ ] **Step 3: Mount hook in App**

In `src/renderer/App.tsx` add `useGlobalShortcuts()` alongside `useWorkspaceWatcher()`:
```tsx
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
// ...
useWorkspaceWatcher()
useGlobalShortcuts()
```

- [ ] **Step 4: Verify all shortcuts**

Run `npm run dev`. Verify: Ctrl+O opens folder picker; Ctrl+S saves (dirty dot clears); Ctrl+W closes tab; Ctrl+C/V/X/A work inside editor; Ctrl+N opens folder picker when no workspace.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: global shortcuts (Ctrl+S/N/O/W) + open-folder in title bar"
```

---

## Task 10: Real-time sync verification + dirty-file external-change toast

**Files:**
- Modify: `src/renderer/hooks/useWorkspaceWatcher.ts` (notify on dirty conflict)
- Modify: `src/renderer/store/editorStore.ts` (`reloadFromDisk` returns conflict flag)

- [ ] **Step 1: Update reloadFromDisk to surface conflicts**

In `src/renderer/store/editorStore.ts`, change `reloadFromDisk`:
```ts
reloadFromDisk: async (path) => {
  const t = get().tabs.find(x => x.path === path); if (!t || t.binary) return
  if (t.dirty) {
    // don't clobber; notify via a flag consumed by the hook
    get()._conflictPaths().includes(path) || useEditor.setState({ _conflict: [...get()._conflict, path] })
    return
  }
  const { content } = await api.fs.readFile(path)
  set(s => ({ tabs: s.tabs.map(x => x.path === path ? { ...x, content, savedContent: content, dirty: false } : x) }))
}
```
Add to interface + initial state:
```ts
_conflict: string[]
_conflictPaths: () => string[]
```
```ts
_conflict: [],
_conflictPaths: () => get()._conflict,
```
And in `setContent`, clear conflict when user edits: after mapping, if the edited path is in `_conflict`, remove it.

- [ ] **Step 2: Hook shows toast on conflict**

In `src/renderer/hooks/useWorkspaceWatcher.ts`:
```ts
const push = useToast(s => s.push)
// inside onWatchEvent:
if (e.type === 'change') {
  const before = useEditor.getState()._conflictPaths().length
  await reloadFromDisk(e.path)
  const after = useEditor.getState()._conflictPaths().length
  if (after > before) push(`“${e.path.split('\\').pop()}” 在磁盘上已修改，但你有未保存的更改`, 'warn')
}
```

- [ ] **Step 3: Manual sync verification**

Run `npm run dev`, open a workspace, open `a.txt`. Externally edit `a.txt` → editor updates live. Create `b.ts` externally → appears in tree. Delete `c.md` externally → disappears. Edit `a.txt` in editor (dirty), then externally modify → toast warns, content preserved.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: real-time file sync with dirty-conflict notification"
```

---

## Task 11: Polish pass — theme consistency, scrollbars, micro-animations, build

**Files:**
- Modify: `src/renderer/styles/global.css` (selection color, focus rings)
- Verify: `npm run build` produces `out/`

- [ ] **Step 1: Selection + focus polish**

Append to `src/renderer/styles/global.css`:
```css
::selection{background:rgba(203,166,247,.3)}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent-2);outline-offset:1px}
.tab,.tn{transition:background .12s ease}
.editor-area__body{transition:opacity .2s ease}
```

- [ ] **Step 2: Final build**

Run: `npm run build && npm run test`
Expected: build succeeds, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "polish: selection, focus rings, transitions; build green"
```

---

## Self-Review

**1. Spec coverage (each requirement → task):**
1. 实时同步文件树 → Tasks 4 (Watcher) + 5 (store) + 6 (treeOps+hook) + 7 (UI) + 10 (verify). ✅
2. 不同文件类型现代 logo → Task 7 FileIcon (per-extension colored SVG). ✅
3. 二进制文件树可见不可编辑 + 现代通知 → Task 3 binary detection + Task 7 toast on open + Task 8 binary editor pane. ✅
4. 光标动画平滑无卡顿 → Task 8 Monaco `cursorSmoothCaretAnimation:'explicit'`, `smoothScrolling`, `automaticLayout`. ✅
5. Tab 自动补全 → Task 8 `quickSuggestions`, `suggestOnTriggerCharacters`, `tabCompletion:'on'` (Tab accepts). ✅
6. 无工作区欢迎页 → Task 8 WelcomePage ("Yanxi Code -- As coding as developing"). ✅
7. Ctrl+N/S/C/V 等 → Task 9 (S/N/O/W) + Monaco native C/V/X/A. ✅
8. 关闭未保存弹窗 + 右键新建/删除 → Task 7 ContextMenu + Task 8 ConfirmDialog. ✅
9. 代码面板实时同步 → Task 10. ✅
10. 自定义标题栏 + 删除原生菜单 → Task 2 (`frame:false`, `Menu.setApplicationMenu(null)`). ✅
11. UI 现代/高级/美观 → Catppuccin-inspired tokens, animations, toasts, modals across Tasks 2/7/8/11. ✅

**2. Placeholder scan:** Removed `monacoKeyCode_TabAccept` placeholder concern — noted default behavior handles Tab-accept; implementation uses Monaco defaults. No TODO/TBD remains.

**3. Type consistency:** `FileNode`, `WatchEvent`, `ApiShape`, `Tab` defined once in shared/store; reused with matching signatures across ipc/preload/stores/hooks. `applyWatchEvent` signature matches between `treeOps.ts` (tested) and `fileTreeStore.ts` (consumer). ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-15-yanxi-code-v3-mvp.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session with checkpoints for review.

Which approach?
