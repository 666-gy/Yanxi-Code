import fs from 'node:fs'
import path from 'node:path'

export const YAN_AGENT_WORKSPACE_HANDOFF_FILE = 'yan-agent-yanxi-code-workspace.json'

interface WorkspaceWebContents {
  isDestroyed: () => boolean
  isLoadingMainFrame: () => boolean
  send: (channel: string, workspace: string) => void
}

interface WorkspaceWindow {
  isDestroyed: () => boolean
  webContents: WorkspaceWebContents
}

interface WorkspaceHandoff {
  source?: string
  requestId?: string
  workspace?: string
  consumed?: boolean
  at?: number
  consumedAt?: number
}

interface BridgeOptions {
  initialArgv?: string[]
  getWindow: () => WorkspaceWindow | null
  getHandoffPath: () => string
}

export function parseOpenWorkspaceArg(argv: string[] = process.argv): string | undefined {
  const index = argv.indexOf('--open-workspace')
  if (index < 0) return undefined
  return argv[index + 1] ?? ''
}

function resolveWorkspace(value: unknown): string {
  const input = String(value || '').trim()
  if (!input) return ''
  const resolved = path.resolve(input)
  try {
    return fs.statSync(resolved).isDirectory() ? resolved : ''
  } catch {
    return ''
  }
}

export class YanAgentWorkspaceBridge {
  private pendingWorkspace = ''
  private lastRequestId = ''
  private watching = false

  constructor(private readonly options: BridgeOptions) {
    this.pendingWorkspace = resolveWorkspace(parseOpenWorkspaceArg(options.initialArgv))
  }

  enqueueFromArgs(argv: string[]): string {
    const workspace = resolveWorkspace(parseOpenWorkspaceArg(argv))
    if (!workspace) return ''
    this.pendingWorkspace = workspace
    this.deliver()
    return workspace
  }

  readHandoff(): string {
    let payload: WorkspaceHandoff
    try {
      payload = JSON.parse(fs.readFileSync(this.options.getHandoffPath(), 'utf8')) as WorkspaceHandoff
    } catch {
      return ''
    }
    if (payload.source !== 'yan-agent' || payload.consumed === true) return ''
    const requestId = String(payload.requestId || '')
    if (requestId && requestId === this.lastRequestId) return ''
    const workspace = resolveWorkspace(payload.workspace)
    if (!workspace) return ''

    this.lastRequestId = requestId
    this.pendingWorkspace = workspace
    this.deliver()
    return workspace
  }

  deliver(): boolean {
    if (!this.pendingWorkspace) return false
    const win = this.options.getWindow()
    if (!win || win.isDestroyed() || win.webContents.isDestroyed() || win.webContents.isLoadingMainFrame()) {
      return false
    }
    win.webContents.send('workspace:open-from-agent', this.pendingWorkspace)
    return true
  }

  consumePending(): string {
    const workspace = this.pendingWorkspace
    this.pendingWorkspace = ''
    return workspace
  }

  acknowledge(workspace: string): void {
    const resolved = resolveWorkspace(workspace)
    if (resolved && resolved === this.pendingWorkspace) this.pendingWorkspace = ''

    const syncPath = this.options.getHandoffPath()
    let payload: WorkspaceHandoff
    try {
      payload = JSON.parse(fs.readFileSync(syncPath, 'utf8')) as WorkspaceHandoff
    } catch {
      return
    }
    if (payload.source !== 'yan-agent') return
    if (resolveWorkspace(payload.workspace) !== resolved) return
    try {
      fs.writeFileSync(syncPath, JSON.stringify({
        ...payload,
        consumed: true,
        consumedAt: Date.now(),
      }, null, 2), 'utf8')
    } catch {
      // The workspace is already applied; a failed receipt write must not roll it back.
    }
  }

  start(): void {
    if (this.watching) return
    const syncPath = this.options.getHandoffPath()
    fs.watchFile(syncPath, { interval: 250 }, () => this.readHandoff())
    this.watching = true
    this.readHandoff()
  }

  stop(): void {
    if (!this.watching) return
    fs.unwatchFile(this.options.getHandoffPath())
    this.watching = false
  }
}
