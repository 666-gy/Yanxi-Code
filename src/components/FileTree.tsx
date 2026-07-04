import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, RefreshCw, FilePlus } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { FileNode } from '../types';
import { detectLanguage } from '../utils/codeExtractor';

interface FileTreeItemProps {
  file: FileNode;
  depth: number;
  forceExpand?: boolean;
}

function FileTreeItem({ file, depth, forceExpand }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(forceExpand ?? depth === 0);
  const [children, setChildren] = useState<FileNode[] | undefined>(file.children);
  const [loading, setLoading] = useState(false);
  const { openTabs, activeFilePath, openFile } = useStore();

  useEffect(() => {
    if (forceExpand !== undefined) setExpanded(forceExpand);
  }, [forceExpand]);

  const isActive = openTabs.some(t => t.path === file.path) && activeFilePath === file.path;

  if (file.isDirectory) {
    const toggleDirectory = async () => {
      const next = !expanded;
      setExpanded(next);
      if (!next) {
        setChildren(undefined);
        return;
      }
      if (next && children === undefined && window.electronAPI) {
        setLoading(true);
        try {
          setChildren(await window.electronAPI.readDirectory(file.path));
        } finally {
          setLoading(false);
        }
      }
    };
    return (
      <div>
        <div
          className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-cyber-800/50 transition-colors text-scholar-text group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={toggleDirectory}
        >
          {expanded ? (
            <ChevronDown size={14} className="text-scholar-subtle shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-scholar-subtle shrink-0" />
          )}
          {expanded ? (
            <FolderOpen size={16} className="text-amber-400/80 shrink-0" />
          ) : (
            <Folder size={16} className="text-amber-500/70 shrink-0" />
          )}
          <span className="text-sm truncate flex-1">{file.name}</span>
        </div>
        {expanded && (
          <div>
            {loading && (
              <div className="text-xs text-scholar-subtle py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 22}px` }}>
                正在加载…
              </div>
            )}
            {children?.map((child) => (
              <FileTreeItem key={child.path} file={child} depth={depth + 1} />
            ))}
            {!loading && children?.length === 0 && (
              <div 
                className="text-xs text-scholar-subtle italic py-1"
                style={{ paddingLeft: `${(depth + 1) * 12 + 22}px` }}
              >
                (空文件夹)
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const lang = detectLanguage(file.name);

  const handleClick = async () => {
    if (!window.electronAPI) return;
    const content = await window.electronAPI.readFile(file.path);
    if (content !== null) openFile(file.path, file.name, lang, content);
  };

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors text-sm ${
        isActive
          ? 'bg-cyber-700/60 text-amber-400 border-l-2 border-amber-500'
          : 'text-scholar-text hover:bg-cyber-800/50 border-l-2 border-transparent'
      }`}
      style={{ paddingLeft: `${depth * 12 + 22}px` }}
      onClick={handleClick}
    >
      <FileText size={14} className="text-teal-400/70 shrink-0" />
      <span className="truncate flex-1">{file.name}</span>
      {lang && lang !== 'plaintext' && (
        <span className="text-[10px] text-scholar-subtle uppercase tracking-wider shrink-0">
          {lang.slice(0, 3)}
        </span>
      )}
    </div>
  );
}

export function FileTree() {
  const { files, workspacePath, setFiles, openNewFileDialog } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!window.electronAPI || !workspacePath) return;
    setRefreshing(true);
    try {
      const newFiles = await window.electronAPI.readDirectory(workspacePath);
      setFiles(newFiles);
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (!workspacePath) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 text-center">
        <FolderOpen size={32} className="text-scholar-subtle mb-3 opacity-50" />
        <p className="text-sm text-scholar-muted mb-1">未打开工作区</p>
        <p className="text-xs text-scholar-subtle">点击顶栏的文件夹按钮打开项目</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 flex items-center justify-between border-b border-cyber-700">
        <span className="text-xs font-medium text-scholar-subtle uppercase tracking-wider">
          资源管理器
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-cyber-800 transition-colors text-scholar-muted hover:text-amber-400"
            title="刷新文件树"
            disabled={refreshing}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openNewFileDialog}
            className="p-1 rounded hover:bg-cyber-800 transition-colors text-scholar-muted hover:text-amber-400"
            title="新建文件"
          >
            <FilePlus size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="text-center py-8 text-xs text-scholar-subtle">
            (工作区为空)
          </div>
        ) : (
          files.map((file) => (
            <FileTreeItem key={file.path} file={file} depth={0} forceExpand={false} />
          ))
        )}
      </div>
    </div>
  );
}
