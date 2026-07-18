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
    },
    consumeAgentWorkspace: () => ipcRenderer.invoke('workspace:consume-agent-open'),
    acknowledgeAgentWorkspace: (workspace) => ipcRenderer.send('workspace:ack-agent-open', workspace),
    onAgentWorkspace: (cb) => {
      const h = (_: unknown, workspace: string) => cb(workspace)
      ipcRenderer.on('workspace:open-from-agent', h)
      return () => ipcRenderer.off('workspace:open-from-agent', h)
    },
  },
  agent: {
    isInstalled: () => ipcRenderer.invoke('agent:isInstalled'),
    openAndSync: (workspace) => ipcRenderer.invoke('agent:openAndSync', workspace),
  }
}
contextBridge.exposeInMainWorld('api', api)
