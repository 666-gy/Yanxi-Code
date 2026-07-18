import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

export function resolveAppIconPath(): string {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'icon.png')]
    : [
        join(__dirname, '../../../build/icon.png'),
        join(app.getAppPath(), 'build/icon.png'),
      ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[candidates.length - 1] ?? join(process.resourcesPath, 'icon.png')
}
