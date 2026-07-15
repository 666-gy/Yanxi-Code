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
