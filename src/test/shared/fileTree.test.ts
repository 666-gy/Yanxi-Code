import { describe, it, expect } from 'vitest'
import { applyWatchEvent, findNode } from '../../shared/treeOps'
import type { FileNode } from '../../shared/types'

const mkRoot = (children: FileNode[]): FileNode => ({ name: 'r', path: 'C:\\r', isDir: true, expanded: true, children })

describe('applyWatchEvent', () => {
  it('adds a new file under expanded parent', () => {
    const root = mkRoot([])
    const next = applyWatchEvent(root, { type: 'add', path: 'C:\\r\\a.ts', isDir: false })
    expect(next!.children![0].name).toBe('a.ts')
  })
  it('removes a file on unlink', () => {
    const root = mkRoot([{ name: 'a.ts', path: 'C:\\r\\a.ts', isDir: false }])
    const next = applyWatchEvent(root, { type: 'unlink', path: 'C:\\r\\a.ts', isDir: false })
    expect(next!.children).toHaveLength(0)
  })
  it('ignores change events (handled elsewhere)', () => {
    const root = mkRoot([])
    expect(applyWatchEvent(root, { type: 'change', path: 'C:\\r\\a.ts', isDir: false })).toBe(root)
  })
  it('findNode locates nested', () => {
    const root = mkRoot([{ name: 'd', path: 'C:\\r\\d', isDir: true, children: [{ name: 'x.ts', path: 'C:\\r\\d\\x.ts', isDir: false }] }])
    expect(findNode(root, 'C:\\r\\d\\x.ts')?.name).toBe('x.ts')
  })
})
