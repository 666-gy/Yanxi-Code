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
  closeWorkspace: () => ipcRenderer.invoke('close-workspace'),
  setDirty: (dirty) => ipcRenderer.send('app:set-dirty', dirty),
  
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
  toggleCanvasWindow: () => ipcRenderer.invoke('toggle-canvas-window'),
  sendToCanvas: (data) => ipcRenderer.invoke('send-to-canvas', data),
  
  onMenuAction: (callback) => {
    const listeners = [
      ['menu-open-folder', () => callback('menu-open-folder')],
      ['menu-new-file', () => callback('menu-new-file')],
      ['menu-save', () => callback('menu-save')],
    ];
    listeners.forEach(([channel, listener]) => ipcRenderer.on(channel, listener));
    return () => listeners.forEach(([channel, listener]) => ipcRenderer.removeListener(channel, listener));
  },
  
  onWorkspaceChanged: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('workspace-changed', listener);
    return () => ipcRenderer.removeListener('workspace-changed', listener);
  },
  
  onFromMainWindow: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('from-main-window', listener);
    return () => ipcRenderer.removeListener('from-main-window', listener);
  },

  terminal: {
    start: (options) => ipcRenderer.invoke('terminal:start', options),
    write: (terminalId, data) => ipcRenderer.send('terminal:write', { terminalId, data }),
    resize: (terminalId, cols, rows) => ipcRenderer.send('terminal:resize', { terminalId, cols, rows }),
    dispose: (terminalId) => ipcRenderer.invoke('terminal:dispose', terminalId),
    prepareRun: (filePath) => ipcRenderer.invoke('terminal:prepare-run', filePath),
    executeRun: (planId, terminalId) => ipcRenderer.invoke('terminal:execute-run', { planId, terminalId }),
    onData: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    },
    onExit: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('terminal:exit', listener);
      return () => ipcRenderer.removeListener('terminal:exit', listener);
    },
  },

  secrets: {
    saveApiKey: (apiKey) => ipcRenderer.invoke('secrets:save-api-key', apiKey),
    loadApiKey: () => ipcRenderer.invoke('secrets:load-api-key'),
  },

  checkUpdate: () => ipcRenderer.invoke('check-update'),

  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
