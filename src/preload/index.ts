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
