import { api } from './ipc'
import { joinPath } from '../store/pathShim'
import { buildTeachMarkdown, teachMdFileName } from '../utils/yanTeachMd'
import type { TeachRecord } from '../store/yanTeachStore'
import { useEditor } from '../store/editorStore'

const TEACH_DIR = '.yan-teach'

export function getTeachDir(workspaceRoot: string): string {
  return joinPath(workspaceRoot, TEACH_DIR)
}

export function getTeachMdPath(workspaceRoot: string, entry: Pick<TeachRecord, 'id' | 'fileName'>): string {
  return joinPath(getTeachDir(workspaceRoot), teachMdFileName(entry))
}

export async function saveTeachMarkdown(
  workspaceRoot: string,
  entry: TeachRecord,
  language = 'plaintext'
): Promise<string> {
  const dir = getTeachDir(workspaceRoot)
  const mdPath = entry.mdPath ?? getTeachMdPath(workspaceRoot, entry)
  await api.fs.createEntry(dir, true)
  await api.fs.writeFile(mdPath, buildTeachMarkdown(entry, language))
  return mdPath
}

export async function deleteTeachMarkdown(mdPath: string | undefined): Promise<void> {
  if (!mdPath) return
  try {
    await api.fs.deleteEntry(mdPath)
  } catch {
    // 文件可能已被用户手动删除
  }
}

export async function openTeachRecord(
  entry: TeachRecord,
  workspaceRoot: string | null
): Promise<string | null> {
  if (!workspaceRoot) return null
  const mdPath = await saveTeachMarkdown(workspaceRoot, entry, entry.language ?? 'plaintext')
  await openTeachMarkdownInEditor(mdPath)
  return mdPath
}

export async function openTeachMarkdownInEditor(mdPath: string): Promise<void> {
  const { content } = await api.fs.readFile(mdPath)
  const state = useEditor.getState()
  const existing = state.tabs.find((t) => t.path === mdPath)
  if (existing) {
    useEditor.setState((s) => ({
      activePath: mdPath,
      tabs: s.tabs.map((t) => t.path === mdPath
        ? { ...t, content, savedContent: content, dirty: false, mdView: 'preview' as const }
        : t)
    }))
    return
  }
  await useEditor.getState().openFile(mdPath)
}
