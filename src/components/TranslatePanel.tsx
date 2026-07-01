import { useState, useEffect } from 'react';
import { X, RefreshCw, GraduationCap, Lightbulb, Target, Zap, ToggleLeft, ToggleRight, Info, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '../store/useStore';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { detectLanguage, extractSingleLine } from '../utils/codeExtractor';

export function TranslatePanel() {
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    type: 'checking' | 'latest' | 'available' | 'error';
    message: string;
    version?: string;
    notes?: string;
    url?: string;
  } | null>(null);
  const {
    translation,
    isTranslating,
    translatePanelOpen,
    toggleTranslatePanel,
    activeFilePath,
    fileContents,
    cursorPosition,
    aiStatus,
    translateEnabled,
    setTranslateEnabled,
    openTabs,
  } = useStore();
  const { translate } = useDeepSeek();
  
  const [toast, setToast] = useState<{
    type: 'latest' | 'available' | 'error';
    message: string;
    version?: string;
    notes?: string;
    url?: string;
  } | null>(null);

  const handleManualTranslate = () => {
    if (!activeFilePath) return;
    const content = fileContents[activeFilePath] || '';
    const activeTab = openTabs.find(t => t.path === activeFilePath);
    const language = activeTab?.language || detectLanguage(activeFilePath);
    const { content: lineContent } = extractSingleLine(content, cursorPosition.line, language);
    if (lineContent.trim()) {
      translate(lineContent.trim(), language, 'deep');
    }
  };

  const handleCheckUpdate = async () => {
    if (updating || !window.electronAPI?.checkUpdate) return;
    setUpdating(true);
    setUpdateResult({ type: 'checking', message: '正在检查更新...' });
    try {
      const result = await window.electronAPI.checkUpdate();
      if (!result.success) {
        setUpdateResult({ type: 'error', message: result.error || '检查失败' });
        setToast({ type: 'error', message: result.error || '检查更新失败' });
      } else if (result.hasUpdate) {
        setUpdateResult({
          type: 'available',
          message: `发现新版本 v${result.latestVersion}`,
          version: result.latestVersion,
          notes: result.notes,
          url: result.downloadUrl,
        });
        setToast({
          type: 'available',
          message: `发现新版本 v${result.latestVersion}`,
          version: result.latestVersion,
          notes: result.notes,
          url: result.downloadUrl,
        });
      } else {
        setUpdateResult({
          type: 'latest',
          message: `已是最新版 v${result.currentVersion}`,
        });
        setToast({
          type: 'latest',
          message: `已是最新版 v${result.currentVersion}`,
        });
      }
    } catch {
      setUpdateResult({ type: 'error', message: '检查更新失败' });
      setToast({ type: 'error', message: '检查更新失败' });
    }
    setUpdating(false);
  };

  // 弹窗自动消失
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {!translatePanelOpen ? (
      <div className="w-10 bg-cyber-800 border-l border-cyber-700 flex flex-col items-center py-4 shrink-0">
        <button
          onClick={toggleTranslatePanel}
          className="p-2 rounded-lg hover:bg-cyber-700 transition-colors text-amber-400"
          title="展开 Yan Teach"
        >
          <GraduationCap size={20} />
        </button>
        <button
          onClick={() => setTranslateEnabled(!translateEnabled)}
          className="p-2 mt-2 rounded-lg hover:bg-cyber-700 transition-colors"
          title={translateEnabled ? '关闭逐行翻译' : '开启逐行翻译'}
        >
          {translateEnabled ? (
            <ToggleRight size={20} className="text-amber-400" />
          ) : (
            <ToggleLeft size={20} className="text-scholar-subtle" />
          )}
        </button>
        <div className="flex-1" />
        <button
          onClick={handleCheckUpdate}
          disabled={updating}
          className="p-2 mb-2 rounded-lg hover:bg-cyber-700 transition-colors text-scholar-subtle hover:text-amber-400 disabled:opacity-50"
          title="检查更新"
        >
          {updating ? <Loader2 size={20} className="animate-spin text-amber-400" /> : <Info size={20} />}
        </button>
      </div>
      ) : (
    <aside className="w-96 min-w-[300px] bg-cyber-800 border-l border-cyber-700 flex flex-col">
      <div className="h-12 border-b border-cyber-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <GraduationCap size={15} className="text-cyber-950" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-scholar-text">Yan Teach</h2>
            <p className="text-[10px] text-scholar-subtle">边写边译 · AI 逐行教学</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 翻译开关 */}
          <button
            onClick={() => setTranslateEnabled(!translateEnabled)}
            className={`p-1.5 rounded-md transition-colors ${
              translateEnabled 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'text-scholar-subtle hover:bg-cyber-700'
            }`}
            title={translateEnabled ? '点击关闭逐行翻译' : '点击开启逐行翻译'}
          >
            {translateEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
          <button
            onClick={handleManualTranslate}
            className="p-1.5 rounded-md hover:bg-cyber-700 transition-colors text-scholar-muted hover:text-amber-400"
            title="重新翻译（深译）"
          >
            <RefreshCw size={16} className={isTranslating ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={toggleTranslatePanel}
            className="p-1.5 rounded-md hover:bg-cyber-700 transition-colors text-scholar-muted hover:text-scholar-text"
            title="收起"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 更新通知 */}
      {updateResult && (
        <div className={`px-4 py-3 border-b border-cyber-700 ${
          updateResult.type === 'available' ? 'bg-amber-500/10 border-amber-500/30' :
          updateResult.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
          updateResult.type === 'latest' ? 'bg-green-500/10 border-green-500/30' :
          'bg-cyber-700/30'
        }`}>
          <div className="flex items-center gap-2">
            {updateResult.type === 'available' && <Info size={15} className="text-amber-400" />}
            {updateResult.type === 'checking' && <Loader2 size={15} className="text-amber-400 animate-spin" />}
            {updateResult.type === 'latest' && <Info size={15} className="text-green-400" />}
            {updateResult.type === 'error' && <Info size={15} className="text-red-400" />}
            <span className={`text-sm font-medium ${
              updateResult.type === 'available' ? 'text-amber-400' :
              updateResult.type === 'error' ? 'text-red-400' :
              'text-green-400'
            }`}>{updateResult.message}</span>
          </div>
          {updateResult.notes && (
            <p className="text-xs text-scholar-subtle mt-1">{updateResult.notes}</p>
          )}
          {updateResult.type === 'available' && updateResult.url && (
            <button
              onClick={() => { window.electronAPI ? window.open(updateResult.url, '_blank') : null; }}
              className="mt-2 px-3 py-1 text-xs font-medium rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              前往下载
            </button>
          )}
        </div>
      )}

      {/* 翻译关闭提示 */}
      {!translateEnabled && (
        <div className="px-4 py-3 bg-cyber-700/30 border-b border-cyber-700">
          <div className="flex items-center gap-2 text-amber-400">
            <ToggleLeft size={16} />
            <span className="text-sm">逐行翻译已关闭</span>
          </div>
          <p className="text-xs text-scholar-subtle mt-1">
            点击开关开启后，换行时自动翻译上一行
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {isTranslating && !translation && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="loading-dots mb-4">
              <span /><span /><span />
            </div>
            <p className="text-sm text-scholar-muted">
              {aiStatus === 'thinking' ? 'AI 正在思考...' : '正在生成解释...'}
            </p>
          </div>
        )}

        {!isTranslating && !translation && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyber-700/50 flex items-center justify-center mb-4">
              <Lightbulb size={28} className="text-amber-400/60" />
            </div>
            <p className="text-sm text-scholar-muted mb-1">
              {translateEnabled ? '写点代码试试吧' : '翻译功能已关闭'}
            </p>
            <p className="text-xs text-scholar-subtle">
              {translateEnabled
                ? '换行时自动翻译上一行代码'
                : '点击开关开启逐行翻译'}
            </p>
          </div>
        )}

        {translation && (
          <div className={`translate-markdown text-sm ${isTranslating ? 'typing-cursor' : ''}`}>
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark as any}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        background: '#0f172a',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                h1({ children }) {
                  return (
                    <h1 className="flex items-center gap-2 text-amber-400">
                      <Target size={16} />
                      {children}
                    </h1>
                  );
                },
                h2({ children }) {
                  return (
                    <h2 className="flex items-center gap-2 text-amber-400 mt-6 first:mt-0">
                      <Zap size={14} />
                      {children}
                    </h2>
                  );
                },
              }}
            >
              {translation}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="h-8 border-t border-cyber-700 flex items-center justify-between px-4 shrink-0">
        <span className="text-[10px] text-scholar-subtle">
          {isTranslating ? '生成中...' : translation ? '翻译完成' : translateEnabled ? '等待输入' : '已关闭'}
        </span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${
            aiStatus === 'idle' ? 'bg-teal-400' :
            aiStatus === 'thinking' || aiStatus === 'streaming' ? 'bg-amber-400 animate-pulse' :
            aiStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`} />
          <span className="text-[10px] text-scholar-subtle">
            {aiStatus === 'idle' ? '就绪' :
             aiStatus === 'thinking' ? '思考中' :
             aiStatus === 'streaming' ? '输出中' :
             aiStatus === 'error' ? '错误' : '离线'}
          </span>
        </div>
      </div>
    </aside>
      )}
    {/* 右下角 Toast 弹窗 */}
    {toast && (
      <div
        className={`fixed bottom-6 right-6 z-[999] max-w-sm rounded-xl shadow-2xl border backdrop-blur-md animate-slide-up ${
          toast.type === 'available' ? 'bg-amber-500/95 border-amber-400 text-amber-950' :
          toast.type === 'error' ? 'bg-red-500/95 border-red-400 text-white' :
          'bg-green-500/95 border-green-400 text-white'
        }`}
      >
        <div className="flex items-start justify-between p-4 gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
              toast.type === 'available' ? 'bg-amber-400/30' :
              toast.type === 'error' ? 'bg-white/20' : 'bg-white/20'
            }`}>
              <Info size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{toast.message}</p>
              {toast.notes && (
                <p className="text-xs mt-1 opacity-80 line-clamp-2">{toast.notes}</p>
              )}
              {toast.type === 'available' && toast.url && (
                <button
                  onClick={() => { window.electronAPI ? window.open(toast.url, '_blank') : null; }}
                  className="mt-2 px-3 py-1 text-xs font-medium rounded-md bg-amber-950/20 hover:bg-amber-950/30 transition-colors"
                >
                  前往下载
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )}
    </>
  );
}