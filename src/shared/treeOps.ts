import type { FileNode, WatchEvent } from './types'

export const findNode = (root: FileNode | null, path: string): FileNode | undefined => {
  let found: FileNode | undefined
  const walk = (n: FileNode): boolean => {
    if (n.path === path) { found = n; return true }
    if (n.children) for (const c of n.children) if (walk(c)) return true
    return false
  }
  if (root) walk(root)
  return found
}

const sortSiblings = (arr: FileNode[]) =>
  arr.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

const base = (p: string) => p.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || p
const dir = (p: string) => { const a = p.replace(/[/\\]+$/, '').split(/[/\\]/); a.pop(); return a.join('\\') }

export const applyWatchEvent = (root: FileNode | null, e: WatchEvent): FileNode | null => {
  if (!root) return null
  if (e.type === 'change') return root
  const parentPath = dir(e.path)
  const parent = parentPath ? findNode(root, parentPath) : root
  if (!parent || !parent.isDir || !parent.expanded || !parent.children) return root
  if (e.type === 'add' || e.type === 'addDir') {
    if (parent.children.some(c => c.path === e.path)) return root
    parent.children = [...parent.children, { name: base(e.path), path: e.path, isDir: e.type === 'addDir' }]
    sortSiblings(parent.children)
  } else {
    parent.children = parent.children.filter(c => c.path !== e.path)
  }
  return { ...root }
}
