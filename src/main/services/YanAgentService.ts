import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { launchYanAgent, resolveYanAgentLaunch } from '../utils/agent-launcher'
import {
  getYanAgentDataDir,
} from '../utils/yan-agent-paths'

function isYanAgentRunning(): boolean {
  if (process.platform !== 'win32') return false
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq Yan Agent.exe" /FO CSV /NH', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    })
    return /"Yan Agent\.exe"/i.test(out)
  } catch {
    return false
  }
}

/**
 * 将 Yanxi Code 当前工作区写入 Agent 数据目录。
 * 只写 yanxi-sync.json（scope=current-session），不碰 config.json 与 sessions/*.json。
 */
export function writeYanAgentWorkspaceSync(
  agentDataDir: string,
  workspace: string,
  requestId: string,
): void {
  const ws = workspace ? path.resolve(workspace) : ''
  fs.mkdirSync(agentDataDir, { recursive: true })

  fs.writeFileSync(
    path.join(agentDataDir, 'yanxi-sync.json'),
    JSON.stringify(
      {
        workspace: ws,
        source: 'yanxi-code',
        scope: 'current-session',
        requestId,
        consumed: false,
        at: Date.now(),
        showMain: true,
      },
      null,
      2,
    ),
    'utf8',
  )
}

function createYanxiRequestId(): string {
  return `yanxi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function syncWorkspaceToAgentDatastore(workspace: string, requestId: string): void {
  writeYanAgentWorkspaceSync(getYanAgentDataDir(), workspace, requestId)
}

export class YanAgentService {
  isInstalled(): boolean {
    return resolveYanAgentLaunch() !== null
  }

  openAndSync(
    workspace: string | null,
  ): { ok: true; alreadyRunning?: boolean; pid?: number } | { error: string } {
    if (workspace) {
      const ws = path.resolve(workspace)
      if (!fs.existsSync(ws)) return { error: '工作区路径无效' }
    }

    const requestId = workspace ? createYanxiRequestId() : ''
    if (workspace) syncWorkspaceToAgentDatastore(workspace, requestId)

    const running = isYanAgentRunning()
    return launchYanAgent(workspace, {
      alreadyRunning: running || undefined,
      requestId,
    })
  }
}
