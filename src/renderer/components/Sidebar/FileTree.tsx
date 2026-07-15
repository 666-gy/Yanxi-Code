import type React from 'react'
import type { FileNode } from '../../../shared/types'
import { FileTreeNode } from './FileTreeNode'
export function FileTree({ nodes, depth, onContext }: { nodes: FileNode[] | undefined; depth: number; onContext: (e: React.MouseEvent, n: FileNode) => void }) {
  if (!nodes?.length) return <div className="ft-empty">空文件夹</div>
  return <>{nodes.map(n => (
    <div key={n.path}>
      <FileTreeNode node={n} depth={depth} onContext={onContext} />
      {n.isDir && n.expanded && <FileTree nodes={n.children} depth={depth + 1} onContext={onContext} />}
    </div>
  ))}</>
}
