import { useState, useEffect } from 'react';
import { Settings, PanelLeftClose, PanelLeftOpen, FolderOpen, FilePlus, ToggleLeft, ToggleRight, X, Play, TerminalSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import logoUrl from '/logo.svg';

export function Header() {
  const { 
    workspaceName, 
    sidebarOpen, 
    toggleSidebar, 
    openSettings, 
    aiStatus,
    translateEnabled,
    setTranslateEnabled,
    workspacePath,
    openNewFileDialog,
    toggleTerminal,
    requestRun,
  } = useStore();

  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  // 监听工作区变化，开始/停止文件监听
  useEffect(() => {
    if (!window.electronAPI) return;
    
    if (workspacePath) {
      void window.electronAPI.watchWorkspace(workspacePath).catch(() => false);
      void window.electronAPI.readDirectory(workspacePath).then((files) => {
        useStore.getState().setFiles(files);
        useStore.getState().setWorkspaceName(workspacePath.split(/[/\\]/).pop() || workspacePath);
      }).catch(() => {
        useStore.getState().openFolder('', '未打开工作区');
      });
    } else {
      window.electronAPI.unwatchWorkspace();
    }
    
    return () => {
      if (window.electronAPI) {
        window.electronAPI.unwatchWorkspace();
      }
    };
  }, [workspacePath]);

  // 监听文件变化事件，刷新文件树
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleChange = async () => {
      const { workspacePath: currentPath, setFiles } = useStore.getState();
      if (!currentPath) return;
      
      // 重新读取目录
      try {
        const files = await window.electronAPI!.readDirectory(currentPath);
        setFiles(files);
      } catch (err) {
        console.error('刷新文件树失败:', err);
      }
    };

    return window.electronAPI.onWorkspaceChanged(handleChange);
  }, []);

  const statusColors: Record<string, string> = {
    idle: 'bg-teal-400',
    thinking: 'bg-amber-400 breathing-light',
    streaming: 'bg-amber-400 breathing-light',
    error: 'bg-red-500',
    offline: 'bg-gray-500',
  };

  const statusText: Record<string, string> = {
    idle: '就绪',
    thinking: '思考中...',
    streaming: '翻译中...',
    error: '出错',
    offline: '离线',
  };

  const handleOpenFolder = async () => {
    if (!window.electronAPI) return;
    
    const path = await window.electronAPI.openFolder();
    if (path) {
      const name = path.split(/[/\\]/).pop() || path;
      const files = await window.electronAPI.readDirectory(path);
      useStore.getState().openFolder(path, name);
      useStore.getState().setFiles(files);
    }
  };

  const handleCloseWorkspace = async () => {
    if (!window.electronAPI) return;
    const hasModified = useStore.getState().openTabs.some((tab) => tab.modified);
    if (hasModified && !window.confirm('工作区中有未保存的文件，确定关闭吗？')) return;
    await window.electronAPI.closeWorkspace();
    useStore.getState().openFolder('', '未打开工作区');
  };

  return (
    <header className="h-12 bg-transparent border-b border-cyber-700/30 flex items-center justify-between px-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-cyber-800 transition-colors text-scholar-muted hover:text-scholar-text shrink-0"
          title={sidebarOpen ? '隐藏侧栏' : '显示侧栏'}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        
        <div className="flex items-center gap-2 shrink-0">
          <img src={logoUrl} alt="Yanxi Code" className="w-6 h-6 rounded-md" />
          <span className="font-semibold text-scholar-text tracking-wide">Yanxi Code</span>
        </div>

        <div className="h-5 w-px bg-cyber-700 mx-1 shrink-0" />

        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span 
            className="text-sm text-scholar-muted truncate max-w-[160px]" 
            title={workspacePath || workspaceName}
          >
            {workspaceName}
          </span>
          
          {isElectron && (
            <button
              onClick={handleOpenFolder}
              className="p-1 rounded hover:bg-cyber-800 transition-colors text-scholar-muted hover:text-amber-400 shrink-0"
              title="打开文件夹 (Ctrl+O)"
            >
              <FolderOpen size={14} />
            </button>
          )}
          
          {isElectron && workspacePath && (
            <>
              <button
                onClick={openNewFileDialog}
                className="p-1 rounded hover:bg-cyber-800 transition-colors text-scholar-muted hover:text-amber-400 shrink-0"
                title="新建文件 (Ctrl+N)"
              >
                <FilePlus size={14} />
              </button>
              <button
                onClick={handleCloseWorkspace}
                className="p-1 rounded hover:bg-cyber-800 transition-colors text-scholar-muted hover:text-amber-400 shrink-0"
                title="关闭工作区"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isElectron && workspacePath && (
          <>
            <button
              onClick={requestRun}
              className="p-1.5 rounded-md hover:bg-cyber-800 text-scholar-muted hover:text-amber-400"
              title="运行当前文件 (Ctrl+F5)"
            >
              <Play size={17} />
            </button>
            <button
              onClick={toggleTerminal}
              className="p-1.5 rounded-md hover:bg-cyber-800 text-scholar-muted hover:text-amber-400"
              title="切换终端 (Ctrl+`)"
            >
              <TerminalSquare size={17} />
            </button>
          </>
        )}
        {/* Yan Board 药丸按钮 */}
        {isElectron && (
          <button
            onClick={() => window.electronAPI?.toggleCanvasWindow()}
            className="relative flex items-center gap-1.5 px-3 py-1 rounded-full overflow-hidden group hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
            title="打开 Yan Board"
          >
            {/* 流动画背景 - 紫色系 */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-purple-300 to-purple-400 animate-flow" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            
            <div className="relative flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="shrink-0">
                <circle cx="13" cy="13" r="9.5" stroke="currentColor" strokeWidth="2.2" />
                <line x1="19.8" y1="19.8" x2="27" y2="27" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="13" cy="13" r="3" fill="currentColor" opacity="0.18" />
              </svg>
              <span className="text-xs font-semibold text-cyber-950">Yan Board</span>
            </div>
          </button>
        )}

        {/* Yan Teach 开关 */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyber-800/50 cursor-pointer hover:bg-cyber-800 transition-colors"
          onClick={() => setTranslateEnabled(!translateEnabled)}
          title={translateEnabled ? '点击关闭 Yan Teach' : '点击开启 Yan Teach'}
        >
          {translateEnabled ? (
            <ToggleRight size={16} className="text-amber-400" />
          ) : (
            <ToggleLeft size={16} className="text-scholar-subtle" />
          )}
          <span className={`text-xs ${translateEnabled ? 'text-amber-400' : 'text-scholar-subtle'}`}>
            {translateEnabled ? 'Teach 开启' : 'Teach 关闭'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyber-800/50">
          <div className={`w-1.5 h-1.5 rounded-full ${statusColors[aiStatus]} text-amber-400`} />
          <span className="text-xs text-scholar-muted">{statusText[aiStatus]}</span>
        </div>

        <button
          onClick={openSettings}
          className="p-1.5 rounded-md hover:bg-cyber-800 transition-colors text-scholar-muted hover:text-amber-400"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
