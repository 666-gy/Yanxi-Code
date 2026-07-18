import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  YanAgentWorkspaceBridge,
  parseOpenWorkspaceArg,
} from '../../main/services/YanAgentWorkspaceBridge'

describe('YanAgentWorkspaceBridge', () => {
  let root: string
  let workspaceA: string
  let workspaceB: string
  let syncPath: string
  let bridge: YanAgentWorkspaceBridge | null

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'yanxi-agent-bridge-'))
    workspaceA = path.join(root, 'workspace-a')
    workspaceB = path.join(root, 'workspace b')
    syncPath = path.join(root, 'yan-agent-yanxi-code-workspace.json')
    fs.mkdirSync(workspaceA)
    fs.mkdirSync(workspaceB)
    bridge = null
  })

  afterEach(() => {
    bridge?.stop()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('parses the workspace argument without splitting paths containing spaces', () => {
    expect(parseOpenWorkspaceArg(['Yanxi Code.exe', '--open-workspace', workspaceB])).toBe(workspaceB)
    expect(parseOpenWorkspaceArg(['Yanxi Code.exe'])).toBeUndefined()
  })

  it('keeps a cold-start workspace pending until the renderer consumes it', () => {
    bridge = new YanAgentWorkspaceBridge({
      initialArgv: ['Yanxi Code.exe', '--open-workspace', workspaceA],
      getWindow: () => null,
      getHandoffPath: () => syncPath,
    })
    expect(bridge.deliver()).toBe(false)
    expect(bridge.consumePending()).toBe(path.resolve(workspaceA))
    expect(bridge.consumePending()).toBe('')
  })

  it('syncs a new handoff while Yanxi Code is already running and records its receipt', async () => {
    const send = vi.fn()
    bridge = new YanAgentWorkspaceBridge({
      getWindow: () => ({
        isDestroyed: () => false,
        webContents: {
          isDestroyed: () => false,
          isLoadingMainFrame: () => false,
          send,
        },
      }),
      getHandoffPath: () => syncPath,
    })
    bridge.start()

    fs.writeFileSync(syncPath, JSON.stringify({
      source: 'yan-agent',
      requestId: 'request-running-1',
      workspace: workspaceB,
      consumed: false,
    }), 'utf8')

    await vi.waitFor(() => {
      expect(send).toHaveBeenCalledWith('workspace:open-from-agent', path.resolve(workspaceB))
    }, { timeout: 2000, interval: 50 })

    bridge.acknowledge(workspaceB)
    const receipt = JSON.parse(fs.readFileSync(syncPath, 'utf8'))
    expect(receipt.consumed).toBe(true)
    expect(receipt.consumedAt).toEqual(expect.any(Number))
  })

  it('ignores invalid and already-consumed handoffs', () => {
    const send = vi.fn()
    bridge = new YanAgentWorkspaceBridge({
      getWindow: () => ({
        isDestroyed: () => false,
        webContents: {
          isDestroyed: () => false,
          isLoadingMainFrame: () => false,
          send,
        },
      }),
      getHandoffPath: () => syncPath,
    })
    fs.writeFileSync(syncPath, JSON.stringify({
      source: 'yan-agent',
      requestId: 'request-consumed',
      workspace: workspaceA,
      consumed: true,
    }), 'utf8')
    expect(bridge.readHandoff()).toBe('')
    expect(send).not.toHaveBeenCalled()
  })
})
