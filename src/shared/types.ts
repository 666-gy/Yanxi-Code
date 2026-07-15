export type WindowAction = 'minimize' | 'maximize-toggle' | 'close'
export interface WindowApi {
  minimize: () => void
  maximizeToggle: () => void
  close: () => void
  onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
}

export interface FileNode {
  name: string
  path: string
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

export interface ApiShape { window: WindowApi; fs: FsApi }
