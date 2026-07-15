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
  ipcMain.handle('fs:pickImage', async () => {
    const r = await dialog.showOpenDialog({
      title: '选择背景图片',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png','jpg','jpeg','gif','bmp','webp','svg','avif'] }]
    })
    if (r.canceled || !r.filePaths[0]) return null
    // 读取文件并转为 data URL，规避 Electron webSecurity 对 file:// 的限制
    const { readFile } = await import('node:fs/promises')
    const { extname } = await import('node:path')
    const buf = await readFile(r.filePaths[0])
    const ext = extname(r.filePaths[0]).slice(1).toLowerCase()
    const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
    return `data:${mime};base64,${buf.toString('base64')}`
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
