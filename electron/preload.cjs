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
  
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
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

  checkUpdate: () => ipcRenderer.invoke('check-update'),

  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});