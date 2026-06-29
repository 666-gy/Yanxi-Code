const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
  createFile: (dirPath, fileName, content) => ipcRenderer.invoke('create-file', { dirPath, fileName, content }),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  watchWorkspace: (dirPath) => ipcRenderer.invoke('watch-workspace', dirPath),
  unwatchWorkspace: () => ipcRenderer.invoke('unwatch-workspace'),
  
  toggleAgentWindow: () => ipcRenderer.invoke('toggle-agent-window'),
  sendToAgent: (data) => ipcRenderer.invoke('send-to-agent', data),
  sendToMain: (data) => ipcRenderer.invoke('send-to-main', data),
  
  toggleCanvasWindow: () => ipcRenderer.invoke('toggle-canvas-window'),
  sendToCanvas: (data) => ipcRenderer.invoke('send-to-canvas', data),
  
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-open-folder', callback);
    ipcRenderer.on('menu-new-file', callback);
    ipcRenderer.on('menu-save', callback);
  },
  
  onWorkspaceChanged: (callback) => {
    ipcRenderer.on('workspace-changed', callback);
  },
  
  onFromMainWindow: (callback) => {
    ipcRenderer.on('from-main-window', callback);
  },
  
  onFromAgent: (callback) => {
    ipcRenderer.on('from-agent', callback);
  },
});