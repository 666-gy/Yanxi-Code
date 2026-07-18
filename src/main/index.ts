import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { resolveAppIconPath } from './utils/appPaths'
import { attachTrayKeepAlive, bindHideOnClose, registerTrayLifecycle } from './tray'
import {
  YAN_AGENT_WORKSPACE_HANDOFF_FILE,
  YanAgentWorkspaceBridge,
} from './services/YanAgentWorkspaceBridge'

let win: BrowserWindow | null = null
const workspaceBridge = new YanAgentWorkspaceBridge({
  initialArgv: process.argv,
  getWindow: () => win,
  getHandoffPath: () => join(app.getPath('temp'), YAN_AGENT_WORKSPACE_HANDOFF_FILE),
})

function createWindow() {
  const icon = nativeImage.createFromPath(resolveAppIconPath())
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 540,
    frame: false,
    backgroundColor: '#0a0a0a',
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  win.webContents.on('did-finish-load', () => workspaceBridge.deliver())
  Menu.setApplicationMenu(null)
  bindHideOnClose(win)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
app.on('second-instance', (_event, argv) => {
  workspaceBridge.enqueueFromArgs(argv)
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
})

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

registerTrayLifecycle()

app.whenReady().then(() => {
  app.setAppUserModelId('com.yanxi.code')
  registerIpc(workspaceBridge)
  workspaceBridge.start()
  createWindow()
  attachTrayKeepAlive(() => win)
})

app.on('before-quit', () => workspaceBridge.stop())

app.on('activate', () => {
  if (!win || win.isDestroyed()) createWindow()
  else {
    win.show()
    win.focus()
  }
})
