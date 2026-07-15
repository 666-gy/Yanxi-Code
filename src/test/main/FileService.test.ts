import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FileService } from '../../main/services/FileService'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let root = ''
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'yx-')) })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })

describe('FileService', () => {
  it('listDir returns sorted dirs-first tree children', async () => {
    const svc = new FileService()
    await mkdir(join(root, 'zdir'))
    await writeFile(join(root, 'a.ts'), 'x')
    await writeFile(join(root, 'b.txt'), 'y')
    const nodes = await svc.listDir(root)
    expect(nodes[0].isDir).toBe(true)
    expect(nodes[0].name).toBe('zdir')
    expect(nodes.find(n => n.name === 'a.ts')?.isDir).toBe(false)
  })
  it('readFile reports binary for png', async () => {
    const svc = new FileService()
    const p = join(root, 'x.png')
    await writeFile(p, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const r = await svc.readFile(p)
    expect(r.binary).toBe(true)
    expect(r.content).toBe('')
  })
  it('readFile returns text for ts', async () => {
    const svc = new FileService()
    const p = join(root, 'a.ts')
    await writeFile(p, 'export const x = 1')
    const r = await svc.readFile(p)
    expect(r.binary).toBe(false)
    expect(r.content).toBe('export const x = 1')
  })
  it('createEntry + deleteEntry round-trip', async () => {
    const svc = new FileService()
    const p = join(root, 'new.ts')
    await svc.createEntry(p, false)
    expect((await svc.readFile(p)).content).toBe('')
    await svc.deleteEntry(p)
    await expect(svc.readFile(p)).rejects.toThrow()
  })
})
