import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'

let win: BrowserWindow | null = null
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 540,
    frame: false,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  Menu.setApplicationMenu(null)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })

ipcMain.handle('window:minimize', () => win?.minimize())
ipcMain.handle('window:maximize-toggle', () => {
  if (!win) return
  if (win.isMaximized()) win.unmaximize(); else win.maximize()
})
ipcMain.handle('window:close', () => win?.close())
ipcMain.on('window:maximize-state:subscribe', (e) => {
  const send = () => e.sender.send('window:maximize-state', !!win?.isMaximized())
  send()
  win?.on('maximize', send)
  win?.on('unmaximize', send)
})

app.whenReady().then(() => {
  registerIpc()
  createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
