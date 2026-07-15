import chokidar, { type FSWatcher } from 'chokidar'
import type { WatchEvent } from '../../shared/types'

export class WatcherService {
  private watcher: FSWatcher | null = null
  constructor(private emit: (e: WatchEvent) => void) {}

  async watch(dir: string): Promise<void> {
    await this.unwatch()
    this.watcher = chokidar.watch(dir, {
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.*', '**/.*/**'],
      awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 20 }
    })
    const w = this.watcher
    w.on('add',      (p) => this.emit({ type: 'add', path: p, isDir: false }))
    w.on('change',   (p) => this.emit({ type: 'change', path: p, isDir: false }))
    w.on('unlink',   (p) => this.emit({ type: 'unlink', path: p, isDir: false }))
    w.on('addDir',   (p) => this.emit({ type: 'addDir', path: p, isDir: true }))
    w.on('unlinkDir',(p) => this.emit({ type: 'unlinkDir', path: p, isDir: true }))
    await new Promise<void>((res) => w.on('ready', () => res()))
  }

  async unwatch(): Promise<void> {
    if (this.watcher) { await this.watcher.close(); this.watcher = null }
  }
}
