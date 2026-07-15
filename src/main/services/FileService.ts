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
    if (isBinaryPath(path)) return { content: '', binary: true }
    const content = await fsReadFile(path, 'utf8')
    return { content, binary: false }
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
