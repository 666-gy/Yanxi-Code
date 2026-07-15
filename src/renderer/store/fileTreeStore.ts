import { create } from 'zustand'
import { api } from '../services/ipc'
import type { FileNode, WatchEvent } from '../../shared/types'
import { basename } from './pathShim'
import { applyWatchEvent as applyShared, findNode as findShared } from '../../shared/treeOps'

interface TreeState {
  root: FileNode | null
  loading: boolean
  loadRoot: (dir: string) => Promise<void>
  toggle: (path: string) => Promise<void>
  applyWatchEvent: (e: WatchEvent) => void
  findNode: (path: string) => FileNode | undefined
}

export const useFileTree = create<TreeState>((set, get) => ({
  root: null,
  loading: false,

  loadRoot: async (dir) => {
    set({ loading: true })
    const children = await api.fs.listDir(dir)
    set({ root: { name: basename(dir), path: dir, isDir: true, expanded: true, children }, loading: false })
    await api.fs.watch(dir)
  },

  toggle: async (path) => {
    const root = get().root; if (!root) return
    const node = get().findNode(path); if (!node || !node.isDir) return
    if (!node.expanded) {
      node.children = await api.fs.listDir(path)
      node.expanded = true
    } else {
      node.expanded = false
    }
    set({ root: { ...root } })
  },

  findNode: (path) => findShared(get().root, path),

  applyWatchEvent: (e) => set({ root: applyShared(get().root, e) })
}))
