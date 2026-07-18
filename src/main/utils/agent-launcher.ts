import { spawn, spawnSync, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export interface YanAgentLaunchTarget {
  exe: string
  args: string[]
  cwd?: string
  mode: 'installed' | 'dev'
}

export interface YanAgentLaunchOptions {
  alreadyRunning?: boolean
  requestId?: string
}

const AGENT_EXE_NAME = 'Yan Agent.exe'

function fileExists(candidate: string | undefined | null): boolean {
  try {
    return !!candidate && fs.existsSync(candidate)
  } catch {
    return false
  }
}

/** Windows 注册表中的最新 PATH（GUI 进程常携带过期的 process.env.PATH）。 */
function getWindowsRegistryPath(): string {
  try {
    return execSync(
      'powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\',\'User\') + \';\' + [Environment]::GetEnvironmentVariable(\'Path\',\'Machine\')"',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, timeout: 5000 },
    ).trim()
  } catch {
    return process.env.Path || process.env.PATH || ''
  }
}

function getPathEnv(): string {
  if (process.platform === 'win32') return getWindowsRegistryPath()
  return process.env.Path || process.env.PATH || ''
}

/** 通过 where / which 在 PATH 中定位 Yan Agent。 */
export function resolveViaPathLookup(): string | null {
  try {
    if (process.platform === 'win32') {
      const pathEnv = getPathEnv()
      const whereExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'where.exe')
      // 必须用 spawn 传参；shell 字符串会把 "Yan Agent.exe" 拆成多个 token
      const result = spawnSync(whereExe, [AGENT_EXE_NAME], {
        encoding: 'utf8',
        env: { ...process.env, PATH: pathEnv, Path: pathEnv },
        windowsHide: true,
        timeout: 5000,
      })
      if (result.status !== 0) return null
      const hit = result.stdout
        .trim()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(fileExists)
      return hit ?? null
    }

    const cmd = process.platform === 'darwin'
      ? 'which "Yan Agent" 2>/dev/null'
      : 'which yan-agent 2>/dev/null'
    const out = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim()
    return fileExists(out) ? out : null
  } catch {
    return null
  }
}

export function resolveYanAgentLaunch(): YanAgentLaunchTarget | null {
  const exe = resolveViaPathLookup()
  if (!exe) return null
  return { exe, args: [], mode: 'installed' }
}

export function parseOpenWorkspaceArg(argv: string[] = process.argv): string | undefined {
  const idx = argv.indexOf('--open-workspace')
  if (idx === -1) return undefined
  return argv[idx + 1] ?? ''
}

export function buildYanAgentLaunchArgs(workspace: string | null, requestId = ''): string[] {
  const args: string[] = []
  const ws = workspace ? path.resolve(workspace) : ''
  if (ws) {
    args.push('--open-workspace', ws)
    if (/^[a-zA-Z0-9_-]{1,160}$/.test(requestId)) {
      args.push('--yanxi-request-id', requestId)
    }
  }
  args.push('--show-main')
  return args
}

export function launchYanAgent(
  workspace: string | null,
  opts?: YanAgentLaunchOptions,
): { ok: true; pid?: number; alreadyRunning?: boolean } | { error: string } {
  const launch = resolveYanAgentLaunch()
  if (!launch) {
    return {
      error: '未检测到 Yan Agent。请确认已安装且 Yan Agent.exe 在系统 PATH 中，或从 github.com/666-gy/Yan-Agent/releases 下载。',
    }
  }

  const ws = workspace ? path.resolve(workspace) : ''
  if (ws && !fileExists(ws)) {
    return { error: '工作区路径无效' }
  }

  const launchArgs = buildYanAgentLaunchArgs(ws || null, opts?.requestId)
  const pathEnv = getPathEnv()

  try {
    const child = spawn(launch.exe, launchArgs, {
      cwd: path.dirname(launch.exe),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, PATH: pathEnv, Path: pathEnv },
    })
    child.unref()
    return { ok: true, pid: child.pid, alreadyRunning: opts?.alreadyRunning }
  } catch (error) {
    const message = error instanceof Error ? error.message : '启动 Yan Agent 失败'
    return { error: message }
  }
}
