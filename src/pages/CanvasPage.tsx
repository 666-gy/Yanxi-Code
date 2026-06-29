import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Download, Trash2, Plus, ChevronRight, Sparkles, FileText, ArrowRight, Edit3, Save, FolderOpen, X, Loader2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface CanvasNote {
  id: string;
  line: number;
  code: string;
  note: string;
}

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  children?: FileItem[];
}

interface FileCanvas {
  path: string;
  name: string;
  notes: CanvasNote[];
  lastUpdated: number;
}

const CANVAS_STORAGE_KEY = 'decipher-canvas-cache';

export function CanvasPage() {
  useTheme();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeCanvas, setActiveCanvas] = useState<FileCanvas | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workspacePath, setWorkspacePath] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [canvasCache, setCanvasCache] = useState<FileCanvas[]>([]);

  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = () => {
    const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCanvasCache(parsed.files || []);
        setWorkspacePath(parsed.workspacePath || '');
        if (parsed.workspacePath) {
          loadDirectory(parsed.workspacePath);
        }
      } catch {}
    }
  };

  const saveToCache = () => {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({
      files: canvasCache,
      workspacePath,
    }));
  };

  const loadDirectory = async (dirPath: string) => {
    if (!window.electronAPI) return;
    try {
      const items = await window.electronAPI.readDirectory(dirPath);
      setFiles(items);
      setWorkspacePath(dirPath);
      saveToCache();
    } catch {
      setFiles([]);
    }
  };

  const handleOpenWorkspace = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.openFolder();
    if (path) {
      await loadDirectory(path);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectFile = async (file: FileItem) => {
    if (file.isDirectory) {
      toggleDir(file.path);
      return;
    }

    setActiveFile(file.path);
    setIsLoading(true);

    const cached = canvasCache.find(c => c.path === file.path);
    if (cached) {
      setActiveCanvas(cached);
      setIsLoading(false);
      return;
    }

    if (!window.electronAPI) {
      setIsLoading(false);
      return;
    }

    try {
      const content = await window.electronAPI.readFile(file.path);
      if (!content) {
        setActiveCanvas({
          path: file.path,
          name: file.name,
          notes: [],
          lastUpdated: Date.now(),
        });
        setIsLoading(false);
        return;
      }

      const notes = await generateNotes(content, file.path);
      const newCanvas: FileCanvas = {
        path: file.path,
        name: file.name,
        notes,
        lastUpdated: Date.now(),
      };
      
      setCanvasCache(prev => [...prev, newCanvas]);
      setActiveCanvas(newCanvas);
      saveToCache();
    } catch {
      setActiveCanvas({
        path: file.path,
        name: file.name,
        notes: [],
        lastUpdated: Date.now(),
      });
    }
    
    setIsLoading(false);
  };

  const generateNotes = async (code: string, filePath: string): Promise<CanvasNote[]> => {
    let apiKey = '';
    let apiBase = 'https://api.deepseek.com';
    let model = 'deepseek-chat';
    
    const saved = localStorage.getItem('decipher-storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        apiKey = parsed.state?.settings?.apiKey || '';
        apiBase = parsed.state?.settings?.apiBase || apiBase;
        model = parsed.state?.settings?.model || model;
      } catch {}
    }
    
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

      if (!response.ok) throw new Error('API failed');
      
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
    } catch {}

    const lines = code.split('\n');
    return lines
      .map((line, idx) => ({
        id: `line-${idx}`,
        line: idx + 1,
        code: line.trim(),
        note: '未翻译',
      }))
      .filter(n => n.code.length > 0 && !n.code.startsWith('#') && !n.code.startsWith('//'))
      .slice(0, 20);
  };

  const handleEditNote = (noteId: string, newText: string) => {
    if (!activeCanvas) return;
    
    const updated = {
      ...activeCanvas,
      notes: activeCanvas.notes.map(n => n.id === noteId ? { ...n, note: newText } : n),
    };
    
    setActiveCanvas(updated);
    setCanvasCache(prev => prev.map(c => c.path === activeCanvas.path ? updated : c));
    saveToCache();
    setEditingNote(null);
    setEditText('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!activeCanvas) return;
    
    const updated = {
      ...activeCanvas,
      notes: activeCanvas.notes.filter(n => n.id !== noteId),
    };
    
    setActiveCanvas(updated);
    setCanvasCache(prev => prev.map(c => c.path === activeCanvas.path ? updated : c));
    saveToCache();
  };

  const handleDownload = () => {
    if (!activeCanvas) return;

    const content = `# ${activeCanvas.name} 代码笔记\n\n` +
      activeCanvas.notes
        .sort((a, b) => a.line - b.line)
        .map(n => `## 第 ${n.line} 行\n\n\`\`\`\n${n.code}\n\`\`\`\n\n→ ${n.note}\n`)
        .join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCanvas.name}-笔记.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFileTree = (items: FileItem[], depth: number = 0) => {
    return items.map(item => (
      <div key={item.path}>
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
            activeFile === item.path
              ? 'bg-purple-500/20'
              : 'hover:bg-cyber-800'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleSelectFile(item)}
        >
          {item.isDirectory ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDir(item.path);
                }}
                className="p-0.5 rounded hover:bg-cyber-700 transition-colors"
              >
                {expandedDirs.has(item.path) ? (
                  <ChevronRight size={14} className="text-scholar-muted rotate-90" />
                ) : (
                  <ChevronRight size={14} className="text-scholar-muted" />
                )}
              </button>
              <FolderOpen size={14} className="text-amber-400" />
            </>
          ) : (
            <>
              <div className="w-3" />
              <FileText size={14} className="text-scholar-muted" />
            </>
          )}
          <span className="text-sm text-scholar-text truncate">{item.name}</span>
        </div>
        {item.isDirectory && expandedDirs.has(item.path) && item.children && (
          renderFileTree(item.children, depth + 1)
        )}
      </div>
    ));
  };

  return (
    <div className="h-full w-full flex bg-cyber-950 text-scholar-text overflow-hidden">
      {/* 左侧文件树 */}
      <div className="w-60 border-r border-cyber-700 flex flex-col bg-cyber-900/50">
        <div className="p-3 border-b border-cyber-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-scholar-text">
              <BookOpen size={16} className="text-purple-400" />
              代码笔记
            </h2>
            {workspacePath && (
              <button
                onClick={() => {
                  setWorkspacePath('');
                  setFiles([]);
                  setActiveFile(null);
                  setActiveCanvas(null);
                  saveToCache();
                }}
                className="p-1 rounded hover:bg-cyber-800 text-scholar-muted"
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          {workspacePath ? (
            <p className="text-xs text-scholar-subtle truncate">
              {workspacePath.split(/[/\\]/).pop()}
            </p>
          ) : (
            <button
              onClick={handleOpenWorkspace}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-cyber-800 hover:bg-cyber-700 text-scholar-muted hover:text-purple-400 text-xs transition-colors"
            >
              <FolderOpen size={14} />
              打开工作区
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <div className="text-center py-8 text-scholar-subtle text-sm">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无文件</p>
              <p className="text-xs mt-1">点击上方打开工作区</p>
            </div>
          ) : (
            renderFileTree(files)
          )}
        </div>
      </div>

      {/* 右侧画布区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeCanvas ? (
          <>
            <div className="p-4 border-b border-cyber-700 flex items-center justify-between bg-cyber-900/30">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{activeCanvas.name}</h3>
                <span className="text-xs text-scholar-subtle bg-cyber-800 px-2 py-0.5 rounded">
                  {activeCanvas.notes.length} 条笔记
                </span>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm transition-colors"
              >
                <Download size={14} />
                下载笔记
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 size={32} className="text-purple-400 animate-spin mb-4" />
                  <p className="text-scholar-subtle">正在分析代码...</p>
                </div>
              ) : activeCanvas.notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-scholar-subtle">
                  <Sparkles size={48} className="mb-4 opacity-30" />
                  <p className="text-lg">暂无笔记</p>
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  {activeCanvas.notes
                    .sort((a, b) => a.line - b.line)
                    .map((note, idx) => (
                      <div key={note.id} className="relative">
                        {idx > 0 && (
                          <div className="absolute left-5 -top-6 h-6 w-0.5 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent" />
                        )}
                        
                        <div className="flex gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-lg bg-cyber-800 flex items-center justify-center">
                            <span className="text-xs text-purple-400 font-mono">L{note.line}</span>
                          </div>

                          <div className="flex-1 bg-cyber-800/50 rounded-xl border border-cyber-700 overflow-hidden">
                            <div className="px-4 py-3 bg-cyber-900/50 border-b border-cyber-700">
                              <pre className="text-sm font-mono text-scholar-text whitespace-pre-wrap">
                                {note.code}
                              </pre>
                            </div>

                            <div className="px-4 py-3">
                              <div className="flex items-start gap-3">
                                <ArrowRight size={16} className="text-purple-400 mt-1 shrink-0" />
                                {editingNote === note.id ? (
                                  <div className="flex-1 flex gap-2">
                                    <input
                                      type="text"
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleEditNote(note.id, editText);
                                        if (e.key === 'Escape') {
                                          setEditingNote(null);
                                          setEditText('');
                                        }
                                      }}
                                      className="flex-1 px-3 py-1.5 bg-cyber-900 border border-cyber-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleEditNote(note.id, editText)}
                                      className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg text-sm transition-colors"
                                    >
                                      <Save size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex-1 group">
                                    <p className="text-sm text-scholar-text">{note.note}</p>
                                    <button
                                      onClick={() => {
                                        setEditingNote(note.id);
                                        setEditText(note.note);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 mt-2 text-xs text-scholar-subtle hover:text-purple-400 transition-colors flex items-center gap-1"
                                    >
                                      <Edit3 size={12} /> 双击编辑
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 h-10 shrink-0 rounded-lg hover:bg-red-500/20 transition-all self-start"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-scholar-subtle">
            <BookOpen size={64} className="mb-4 opacity-30" />
            <p className="text-lg">选择一个文件</p>
            <p className="text-sm mt-2">从左侧文件树选择文件开始分析</p>
          </div>
        )}
      </div>
    </div>
  );
}
