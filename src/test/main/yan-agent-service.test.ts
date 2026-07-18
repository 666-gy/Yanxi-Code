import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { writeYanAgentWorkspaceSync } from '../../main/services/YanAgentService'

describe('writeYanAgentWorkspaceSync', () => {
  let tmp: string
  let dataDir: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yanxi-agent-sync-'))
    dataDir = path.join(tmp, 'YanData')
    fs.mkdirSync(path.join(dataDir, 'sessions'), { recursive: true })

    fs.writeFileSync(
      path.join(dataDir, 'config.json'),
      JSON.stringify({ workspace: 'C:\\original-config' }),
      'utf8',
    )
    fs.writeFileSync(
      path.join(dataDir, 'sessions', 'task-b.json'),
      JSON.stringify({ id: 'task-b', title: 'B', workspace: 'C:\\project-B' }),
      'utf8',
    )
    fs.writeFileSync(
      path.join(dataDir, 'sessions', 'task-c.json'),
      JSON.stringify({ id: 'task-c', title: 'C', workspace: 'C:\\project-C' }),
      'utf8',
    )
  })

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('writes yanxi-sync only and leaves config plus sessions untouched', () => {
    const workspaceA = path.join(tmp, 'workspace-A')
    fs.mkdirSync(workspaceA)

    writeYanAgentWorkspaceSync(dataDir, workspaceA, 'yanxi_test_request')

    const cfg = JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8'))
    expect(cfg.workspace).toBe('C:\\original-config')

    const sync = JSON.parse(fs.readFileSync(path.join(dataDir, 'yanxi-sync.json'), 'utf8'))
    expect(path.resolve(sync.workspace)).toBe(path.resolve(workspaceA))
    expect(sync.source).toBe('yanxi-code')
    expect(sync.scope).toBe('current-session')
    expect(sync.requestId).toBe('yanxi_test_request')
    expect(sync.consumed).toBe(false)

    const sessionB = JSON.parse(fs.readFileSync(path.join(dataDir, 'sessions', 'task-b.json'), 'utf8'))
    const sessionC = JSON.parse(fs.readFileSync(path.join(dataDir, 'sessions', 'task-c.json'), 'utf8'))
    expect(sessionB.workspace).toBe('C:\\project-B')
    expect(sessionC.workspace).toBe('C:\\project-C')
  })
})
