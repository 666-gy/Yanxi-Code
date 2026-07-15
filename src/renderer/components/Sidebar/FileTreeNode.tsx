import type React from 'react'
import { useState } from 'react'
import type { FileNode } from '../../../shared/types'
import { useFileTree } from '../../store/fileTreeStore'
import { useEditor } from '../../store/editorStore'
import { useToast } from '../../store/toastStore'
import { FileIcon } from './FileIcon'
interface Props { node: FileNode; depth: number; onContext: (e: React.MouseEvent, node: FileNode) => void }
export function FileTreeNode({ node, depth, onContext }: Props) {
  const toggle = useFileTree(s => s.toggle)
  const openFile = useEditor(s => s.openFile)
  const push = useToast(s => s.push)
  const [spin, setSpin] = useState(false)
  const onClick = async () => {
    if (node.isDir) { setSpin(true); await toggle(node.path); setSpin(false) }
    else {
      const { blocked } = await openFile(node.path)
      if (blocked) push(`"${node.name}" 是二进制文件，无法在编辑器中打开`, 'warn')
    }
  }
  return (
    <div
      className={`tn ${node.isDir ? 'tn--dir' : 'tn--file'}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); onContext(e, node) }}
    >
      <span className={`tn__chev ${spin ? 'spin' : ''}`}>{node.isDir ? (node.expanded ? '▾' : '▸') : ''}</span>
      <FileIcon name={node.name} isDir={node.isDir} expanded={node.expanded} />
      <span className="tn__name">{node.name}</span>
    </div>
  )
}
