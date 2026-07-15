import { readFile as fsReadFile, writeFile as fsWriteFile, readdir, mkdir, rm, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { isBinaryPath } from '../../shared/constants'
import type { FileNode } from '../../shared/types'

export class FileService {
  async listDir(dir: string): Promise<FileNode[]> {
    const entries = await readdir(dir, { withFileTypes: true })
    const nodes: FileNode[] = entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({ name: e.name, path: join(dir, e.name), isDir: e.isDirectory() }))
    nodes.sort((a, b) =>
      Number(b.isDir) - Number(a.isDir) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
    return nodes
  }

  async readFile(path: string): Promise<{ content: string; binary: boolean }> {
    // 第一道防线：按扩展名快速判定
    if (isBinaryPath(path)) return { content: '', binary: true }
    // 第二道防线：读取 buffer，检测前 8KB 是否含 null byte（内容级二进制检测）
    const buf = await fsReadFile(path)
    const checkLen = Math.min(buf.length, 8192)
    for (let i = 0; i < checkLen; i++) {
      if (buf[i] === 0) return { content: '', binary: true }
    }
    return { content: buf.toString('utf8'), binary: false }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fsWriteFile(path, content, 'utf8')
  }

  async createEntry(path: string, isDir: boolean): Promise<void> {
    if (isDir) await mkdir(path, { recursive: true })
    else await fsWriteFile(path, '', 'utf8')
  }

  async deleteEntry(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true })
  }

  async renameEntry(from: string, to: string): Promise<void> {
    await rename(from, to)
  }
}
