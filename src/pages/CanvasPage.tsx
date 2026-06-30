import { useState, useEffect } from 'react';
import { Plus, Upload, FileCode, X, ChevronRight, Search } from 'lucide-react';

interface CanvasNote {
  id: string;
  line: number;
  code: string;
  note: string;
}

interface FileCanvas {
  path: string;
  name: string;
  notes: CanvasNote[];
  lastUpdated: number;
}

const CANVAS_STORAGE_KEY = 'decipher-canvas-cache';
const MAX_RECENT = 20;

/* ── 析镜 Logo SVG ── */
const XiJingLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="13" cy="13" r="9.5" stroke="#c41e3a" strokeWidth="2.2" />
    <line x1="19.8" y1="19.8" x2="27" y2="27" stroke="#c41e3a" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="13" cy="13" r="3" fill="#c41e3a" opacity="0.18" />
  </svg>
);

export function CanvasPage() {
  const [allFiles, setAllFiles] = useState<FileCanvas[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('正在读取文件...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ── 初始化：加载缓存文件 ── */
  useEffect(() => {
    const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const files: FileCanvas[] = parsed.files || [];
      if (files.length > 0) {
        files.sort((a, b) => b.lastUpdated - a.lastUpdated);
        setAllFiles(files);
      }
    } catch {}
  }, []);

  /* ── 持久化 ── */
  const persistFiles = (files: FileCanvas[]) => {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({ files }));
    setAllFiles(files);
  };

  /* ── 新的分析 ── */
  const handleNewAnalysis = () => {
    setActiveIndex(null);
    setErrorMessage(null);
  };

  /* ── 打开文件 ── */
  const handleOpenFile = async () => {
    setErrorMessage(null);
    try {
      const api = (window as any).electronAPI;
      if (!api?.openFileDialog) {
        setErrorMessage('文件选择功能仅在桌面应用中可用');
        return;
      }
      const filePath = await api.openFileDialog();
      if (!filePath) return;
      const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
      await processFile(filePath, fileName);
    } catch (err: any) {
      setErrorMessage(`打开文件失败: ${err.message || '未知错误'}`);
    }
  };

  /* ── 处理文件：读 + AI 分析 + 缓存 ── */
  const processFile = async (filePath: string, fileName: string) => {
    // 去重
    const existing = allFiles.find(f => f.path === filePath);
    if (existing) {
      const idx = allFiles.indexOf(existing);
      setActiveIndex(idx);
      return;
    }

    setIsLoading(true);
    setLoadingText('正在读取文件...');
    setErrorMessage(null);

    if (!window.electronAPI) {
      setErrorMessage('Electron API 未初始化');
      setIsLoading(false);
      return;
    }

    try {
      setLoadingText('正在分析代码结构...');
      const content = await window.electronAPI.readFile(filePath);
      if (!content) {
        setErrorMessage('文件为空或无法读取');
        setIsLoading(false);
        return;
      }

      setLoadingText('正在调用 AI 分析...');
      const notes = await generateNotes(content);

      const newCanvas: FileCanvas = {
        path: filePath,
        name: fileName,
        notes,
        lastUpdated: Date.now(),
      };

      const updatedFiles = [newCanvas, ...allFiles].slice(0, MAX_RECENT);
      persistFiles(updatedFiles);
      setActiveIndex(0);
      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(`处理文件失败: ${err.message || '未知错误'}`);
      setIsLoading(false);
    }
  };

  /* ── AI 分析生成笔记 ── */
  const generateNotes = async (code: string): Promise<CanvasNote[]> => {
    let apiKey = '';
    let apiBase = 'https://api.deepseek.com';
    let model = 'deepseek-chat';

    // 方案1：从 zustand persist 读取 settings
    const saved = localStorage.getItem('decipher-storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        apiKey = parsed.state?.settings?.apiKey || '';
        apiBase = parsed.state?.settings?.apiBase || apiBase;
        model = parsed.state?.settings?.model || model;
      } catch {}
    }
    // 方案2 fallback：单独保存的 key（双保险）
    if (!apiKey)  apiKey  = localStorage.getItem('decipher-api-key') || '';
    if (!apiBase || apiBase === 'https://api.deepseek.com') {
      const fb = localStorage.getItem('decipher-api-base');
      if (fb) apiBase = fb;
    }
    const fbModel = localStorage.getItem('decipher-model');
    if (fbModel) model = fbModel;

    if (!apiKey) {
      const lines = code.split('\n');
      return lines
        .map((line, idx) => ({
          id: `line-${idx}`,
          line: idx + 1,
          code: line.trim(),
          note: '请先配置 API Key',
        }))
        .filter(n => n.code.length > 0 && !n.code.startsWith('#') && !n.code.startsWith('//'));
    }

    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: `分析这段代码，提取关键行，每行用3-8个中文词解释。返回JSON格式：[{"line":行号,"code":"代码内容","note":"解释"}]。只返回JSON，不要其他文字。\n\n\`\`\`\n${code}\n\`\`\``,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[YanBoard] API error:', response.status, errText.slice(0, 200));
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\[.*\]/s);

      if (jsonMatch) {
        const notes = JSON.parse(jsonMatch[0]);
        return notes.map((n: any) => ({
          id: `note-${n.line}-${Date.now()}`,
          line: n.line,
          code: n.code,
          note: n.note,
        }));
      }
      // JSON 解析失败，返回原始回复作为单条笔记
      console.warn('[YanBoard] JSON parse failed, raw content:', content.slice(0, 200));
      return [{ id: 'raw-0', line: 0, code: '', note: content.slice(0, 500) }];
    } catch (err: any) {
      console.error('[YanBoard] AI call failed:', err);
      // 让调用方显示错误而非静默返回"未翻译"
      throw err;
    }
  };

  /* ── 移除文件 ── */
  const handleRemoveFile = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const updated = allFiles.filter((_, i) => i !== idx);
    persistFiles(updated);
    if (activeIndex === idx) {
      setActiveIndex(updated.length > 0 ? 0 : null);
    } else if (activeIndex !== null && activeIndex > idx) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const activeFile = activeIndex !== null ? allFiles[activeIndex] : null;

  return (
    <div className="h-full w-full flex bg-[#f8f9fc] text-[#1a1a2e] overflow-hidden">
      {/* ══════ 左侧边栏 ══════ */}
      <aside className="w-56 h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Logo + 名称 */}
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
          <XiJingLogo />
          <span className="text-lg font-semibold tracking-wide text-[#1a1a2e]">Yan Board</span>
        </div>

        {/* 新的分析按钮 */}
        <div className="px-3 pb-3">
          <button
            onClick={handleNewAnalysis}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f4f5f7] hover:bg-[#ebedf2] text-[#4a4b5c] font-medium text-sm transition-colors"
          >
            <Plus size={17} className="text-[#c41e3a]" />
            新的分析
          </button>
        </div>

        {/* 分隔线 */}
        <div className="mx-4 border-t border-gray-100" />

        {/* 最近打开 */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <p className="px-4 pt-3 pb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
            最近打开
          </p>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
            {allFiles.length === 0 ? (
              <p className="px-2 py-3 text-xs text-gray-300 italic">暂无记录</p>
            ) : (
              allFiles.map((file, idx) => (
                <button
                  key={file.path + '-' + idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors group ${
                    activeIndex === idx
                      ? 'bg-[#fef2f2] text-[#c41e3a]'
                      : 'text-[#4a4b5c] hover:bg-[#f4f5f7]'
                  }`}
                >
                  <FileCode size={14} className="shrink-0 opacity-60" />
                  <span className="truncate flex-1">{file.name}</span>
                  <button
                    onClick={(e) => handleRemoveFile(e, idx)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all"
                    title="移除此文件"
                  >
                    <X size={12} className="text-gray-400 hover:text-red-500" />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ══════ 右侧主内容 ══════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 多文件 Tab 栏 */}
        {allFiles.length > 0 && (
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 bg-white border-b border-gray-100 overflow-x-auto scrollbar-thin shrink-0">
            {allFiles.map((file, idx) => (
              <div
                key={file.path + '-tab-' + idx}
                className={`flex items-center px-3 py-1.5 rounded-t-lg text-sm whitespace-nowrap transition-colors select-none ${
                  activeIndex === idx
                    ? 'bg-[#f8f9fc] text-[#1a1a2e] font-medium border-b-2 border-[#c41e3a]'
                    : 'text-gray-500 hover:text-[#1a1a2e] hover:bg-gray-50'
                }`}
              >
                <span
                  onClick={() => setActiveIndex(idx)}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCode size={13} />
                  <span className="max-w-[180px] truncate">{file.name}</span>
                </span>
                <button
                  onClick={() => setActiveIndex(null)}
                  className="ml-1.5 p-0.5 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                  title="关闭此面板"
                >
                  <X size={12} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
            {/* 添加更多文件按钮 */}
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-400 hover:text-[#c41e3a] hover:bg-gray-50 rounded-lg transition-colors ml-1"
              title="添加更多文件"
            >
              <Plus size={15} />
            </button>
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 flex flex-col items-center">
          {/* 错误提示 */}
          {errorMessage && (
            <div className="w-full max-w-2xl mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between shrink-0">
              <p className="text-sm text-red-600">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading ? (
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#c41e3a] animate-spin" />
              </div>
              <p className="text-gray-700 font-medium mb-2">{loadingText}</p>
            </div>
          ) : activeFile ? (
            /* ── 分析结果 ── */
            <div className="w-full max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#f4f5f7] flex items-center justify-center">
                  <FileCode size={20} className="text-[#c41e3a]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1a1a2e]">{activeFile.name}</h2>
                  <p className="text-sm text-gray-400">{activeFile.notes.length} 条分析</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                {activeFile.notes.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">暂无分析结果</p>
                ) : (
                  activeFile.notes
                    .sort((a, b) => a.line - b.line)
                    .map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-gray-100 bg-[#fafbfc] p-4 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded bg-[#f4f5f7] text-xs font-mono text-[#c41e3a]">
                            L{note.line}
                          </span>
                          <div className="flex-1 min-w-0">
                            <pre className="text-sm font-mono text-[#1a1a2e] whitespace-pre-wrap mb-2 overflow-x-auto">
                              {note.code}
                            </pre>
                            <p className="text-sm text-gray-600">{note.note}</p>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : (
            /* ── 空状态：上传卡片 ── */
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm p-12 my-auto">
              <div className="text-center mb-10">
                <div className="inline-flex mb-4">
                  <XiJingLogo />
                </div>
                <h2 className="text-2xl font-semibold text-[#1a1a2e] mb-2">Yan Board</h2>
                <p className="text-sm text-gray-400">探索代码世界，更上一层</p>
              </div>

              <button
                onClick={handleOpenFile}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#c41e3a] hover:bg-red-50/30 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-[#f4f5f7] flex items-center justify-center group-hover:bg-red-50 transition-colors">
                  <Upload size={26} className="text-[#c41e3a]" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-[#1a1a2e] mb-1">上传文件</p>
                  <p className="text-xs text-gray-400">支持 Python、JavaScript、Java、C/C++ 等</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ══════ 全局隐藏样式：自定义滚动条 ══════ */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}
