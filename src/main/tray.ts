import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { resolveAppIconPath } from './utils/appPaths'

let tray: Tray | null = null
let isQuiting = false

export function isAppQuiting(): boolean {
  return isQuiting
}

function loadTrayIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromPath(resolveAppIconPath())
  if (icon.isEmpty()) return nativeImage.createEmpty()
  return icon.resize({ width: 16, height: 16 })
}

function showMainWindow(getWindow: () => BrowserWindow | null): void {
  const win = getWindow()
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function attachTrayKeepAlive(getWindow: () => BrowserWindow | null): void {
  const trayIcon = loadTrayIcon()
  if (trayIcon.isEmpty()) {
    console.warn('[tray] icon not found, tray disabled')
    return
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Yanxi Code')

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: () => showMainWindow(getWindow),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuiting = true
        app.quit()
      },
    },
  ]))

  tray.on('click', () => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    if (win.isVisible()) win.hide()
    else showMainWindow(getWindow)
  })
}

export function bindHideOnClose(win: BrowserWindow): void {
  win.on('close', (e) => {
    if (!isQuiting) {
      e.preventDefault()
      win.hide()
    }
  })
}

export function registerTrayLifecycle(): void {
  app.on('window-all-closed', (e) => {
    if (process.platform !== 'darwin') e.preventDefault()
  })

  app.on('before-quit', () => {
    isQuiting = true
    tray?.destroy()
    tray = null
  })
}
