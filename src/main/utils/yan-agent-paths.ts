import path from 'path'
import { app } from 'electron'

/** Yan Agent 用户数据目录（Electron userData = %APPDATA%/yan-agent） */
export function getYanAgentDataDir(): string {
  return path.join(app.getPath('appData'), 'yan-agent', 'YanData')
}

export function getYanAgentConfigPath(): string {
  return path.join(getYanAgentDataDir(), 'config.json')
}

export function getYanAgentSyncPath(): string {
  return path.join(getYanAgentDataDir(), 'yanxi-sync.json')
}

export function getYanAgentSessionsDir(): string {
  return path.join(getYanAgentDataDir(), 'sessions')
}
