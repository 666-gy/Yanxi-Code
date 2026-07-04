import { X, FileText, Circle } from 'lucide-react';
import { useStore } from '../store/useStore';

export function TabBar() {
  const { openTabs, activeFilePath, setActiveFile, closeTab } = useStore();

  if (openTabs.length === 0) return null;

  return (
    <div className="h-9 bg-transparent border-b border-cyber-700/30 flex items-center overflow-x-auto shrink-0">
      {openTabs.map((tab) => {
        const isActive = activeFilePath === tab.path;
        return (
          <div
            key={tab.path}
            className={`group flex items-center gap-2 px-3 h-full cursor-pointer border-r border-cyber-700 transition-colors ${
              isActive
                ? 'bg-cyber-800 text-amber-400'
                : 'text-scholar-muted hover:bg-cyber-800/50 hover:text-scholar-text'
            }`}
            onClick={() => setActiveFile(tab.path)}
          >
            <FileText size={14} className={isActive ? 'text-amber-400' : 'text-scholar-subtle'} />
            <span className="text-sm truncate max-w-[120px]">{tab.name}</span>
            {tab.modified && (
              <Circle size={8} fill="currentColor" className="text-amber-400" />
            )}
            <button
              className={`ml-1 p-0.5 rounded hover:bg-cyber-700 transition-colors ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!tab.modified || window.confirm('该文件有未保存的修改，确定关闭吗？')) {
                  closeTab(tab.path);
                }
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
