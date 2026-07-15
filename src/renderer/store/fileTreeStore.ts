import { create } from 'zustand'
import { api } from '../services/ipc'
import type { FileNode, WatchEvent } from '../../shared/types'
import { basename, dirname } from './pathShim'

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

  findNode: (path) => {
    let found: FileNode | undefined
    const walk = (n: FileNode) => {
      if (n.path === path) { found = n; return true }
      if (n.children) for (const c of n.children) if (walk(c)) return true
      return false
    }
    if (get().root) walk(get().root!)
    return found
  },

  applyWatchEvent: (e) => {
    const root = get().root; if (!root) return
    const parentPath = (e.type === 'addDir' || e.type === 'add' || e.type === 'unlink' || e.type === 'unlinkDir')
      ? dirname(e.path) : null
    if (e.type === 'add' || e.type === 'addDir') {
      const parent = parentPath ? get().findNode(parentPath) : root
      if (parent && parent.isDir && parent.expanded && parent.children && !parent.children.some(c => c.path === e.path)) {
        parent.children.push({ name: basename(e.path), path: e.path, isDir: e.type === 'addDir' })
        parent.children.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      }
    } else if (e.type === 'unlink' || e.type === 'unlinkDir') {
      const parent = parentPath ? get().findNode(parentPath) : root
      if (parent && parent.children) parent.children = parent.children.filter(c => c.path !== e.path)
    }
    set({ root: { ...root } })
  }
}))
