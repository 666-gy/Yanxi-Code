import { useStore } from '../store/useStore';

export function StatusBar() {
  const { activeFilePath, cursorPosition, aiStatus, openTabs, workspacePath } = useStore();
  
  const activeTab = openTabs.find(t => t.path === activeFilePath);
  const language = activeTab?.language || '';

  return (
    <footer className="h-6 bg-transparent border-t border-cyber-700/30 flex items-center justify-between px-4 shrink-0 text-[11px]">
      <div className="flex items-center gap-4">
        {workspacePath && (
          <span className="text-scholar-subtle">
            工作区: {workspacePath.split(/[/\\]/).pop()}
          </span>
        )}
        {activeFilePath && language && (
          <>
            <span className="text-scholar-subtle flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              {language.toUpperCase()}
            </span>
            <span className="text-scholar-subtle">
              行 {cursorPosition.line}，列 {cursorPosition.column}
            </span>
          </>
        )}
        {activeTab?.modified && (
          <span className="text-amber-400">已修改</span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-scholar-subtle">UTF-8</span>
        <span className="text-scholar-subtle">空格: 2</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            aiStatus === 'idle' ? 'bg-teal-400' :
            aiStatus === 'thinking' || aiStatus === 'streaming' ? 'bg-amber-400 breathing-light' :
            aiStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`} />
          <span className="text-scholar-subtle">
            {aiStatus === 'idle' ? 'AI 就绪' :
             aiStatus === 'thinking' ? 'AI 思考中' :
             aiStatus === 'streaming' ? 'AI 输出中' :
             aiStatus === 'error' ? 'AI 错误' : 'AI 离线'}
          </span>
        </div>
      </div>
    </footer>
  );
}