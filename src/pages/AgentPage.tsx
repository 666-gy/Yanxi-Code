import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Sparkles, FileText, Plus, Trash2, Code, Check, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../hooks/useTheme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: FileChange[];
  timestamp: number;
}

interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  original?: string;
  modified?: string;
  language?: string;
  confirmed?: boolean;
}

const AGENT_SYSTEM_PROMPT = `你是一个代码生成助手。只输出代码变更，不要任何解释、说明或寒暄。

创建文件用此格式：
\`\`\`file:path/to/file.py
完整代码
\`\`\`

修改文件用此格式：
**修改文件：** path/to/file.py
\`\`\`original
原始代码
\`\`\`
\`\`\`modified
修改后的代码
\`\`\`

只输出代码，其他一律不说。`;

export function AgentPage() {
  useTheme();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 你好！我是 Decipher Agent。\n\n我可以帮你：\n- **读写文件** - 查看和编辑工作区中的文件\n- **创建文件** - 新建代码文件\n- **修改代码** - 优化和修复代码\n- **删除文件** - 清理不需要的文件\n\n有什么我可以帮你的吗？',
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FileChange[]>([]);
  const [settings, setSettings] = useState({
    apiKey: '',
    apiBase: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('decipher-storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.state?.settings) {
          setSettings({
            apiKey: parsed.state.settings.apiKey || '',
            apiBase: parsed.state.settings.apiBase || 'https://api.deepseek.com',
            model: parsed.state.settings.model || 'deepseek-chat',
          });
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseFileChanges = (content: string): FileChange[] => {
    const changes: FileChange[] = [];
    
    const fileBlocks = content.match(/```file:([^\n]+)\n([\s\S]*?)```/g);
    if (fileBlocks) {
      for (const block of fileBlocks) {
        const match = block.match(/```file:([^\n]+)\n([\s\S]*?)```/);
        if (match) {
          const [, path, fileContent] = match;
          const ext = path.split('.').pop()?.toLowerCase() || '';
          changes.push({
            path: path.trim(),
            action: 'create',
            modified: fileContent.trim(),
            language: ext,
            confirmed: false,
          });
        }
      }
    }

    const modifyBlocks = content.match(/\*\*修改文件：\*\*\s*([^\n]+)\s*\n\s*```original\s*\n([\s\S]*?)```\s*\n\s*```modified\s*\n([\s\S]*?)```/g);
    if (modifyBlocks) {
      for (const block of modifyBlocks) {
        const match = block.match(/\*\*修改文件：\*\*\s*([^\n]+)\s*\n\s*```original\s*\n([\s\S]*?)```\s*\n\s*```modified\s*\n([\s\S]*?)```/);
        if (match) {
          const [, path, original, modified] = match;
          const ext = path.split('.').pop()?.toLowerCase() || '';
          changes.push({
            path: path.trim(),
            action: 'modify',
            original: original.trim(),
            modified: modified.trim(),
            language: ext,
            confirmed: false,
          });
        }
      }
    }

    return changes;
  };

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    if (!settings.apiKey) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '> ⚠️ 请先在主窗口的设置中配置 DeepSeek API Key 才能使用 Agent 功能。',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
      return;
    }

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${settings.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: AGENT_SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: inputValue.trim() },
          ],
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      let fullContent = '';
      const assistantId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      const changes = parseFileChanges(fullContent);
      if (changes.length > 0) {
        setPendingChanges(changes);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, files: changes } : m
          )
        );
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `> ⚠️ 出错了：${err.message}\n\n请检查 API Key 是否正确，或网络连接是否正常。`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, settings]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const confirmChange = async (index: number) => {
    const change = pendingChanges[index];
    if (!change || !window.electronAPI) return;

    try {
      if (change.action === 'create' || change.action === 'modify') {
        let workspacePath = '';
        const saved = localStorage.getItem('decipher-storage');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            workspacePath = parsed.state?.workspacePath || '';
          } catch {}
        }
        
        if (!workspacePath) {
          alert('请先在主窗口打开工作区');
          return;
        }

        if (change.action === 'create') {
          const fileName = change.path.split('/').pop() || change.path;
          const dirPath = change.path.includes('/') 
            ? change.path.substring(0, change.path.lastIndexOf('/'))
            : '';
          
          const fullDir = dirPath ? `${workspacePath}/${dirPath}` : workspacePath;
          await window.electronAPI.createFile(fullDir, fileName, change.modified || '');
        } else if (change.action === 'modify') {
          const fullPath = `${workspacePath}/${change.path}`;
          await window.electronAPI.saveFile(fullPath, change.modified || '');
        }
      }

      setPendingChanges((prev) =>
        prev.map((c, i) => (i === index ? { ...c, confirmed: true } : c))
      );
    } catch (err: any) {
      alert(`操作失败: ${err.message}`);
    }
  };

  const rejectChange = (index: number) => {
    setPendingChanges((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full w-full flex flex-col bg-cyber-950 text-scholar-text overflow-hidden">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                message.role === 'user'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-gradient-to-br from-amber-400 to-amber-600 text-cyber-950'
              }`}
            >
              {message.role === 'user' ? <Sparkles size={20} /> : <Bot size={20} />}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                message.role === 'user'
                  ? 'bg-amber-500/20 text-scholar-text'
                  : 'bg-cyber-800 text-scholar-text'
              }`}
            >
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              
              {message.files && message.files.length > 0 && (
                <div className="mt-4 space-y-3">
                  {message.files.map((file, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border overflow-hidden ${
                        file.confirmed
                          ? 'border-teal-500/50 bg-teal-500/10'
                          : 'border-cyber-600 bg-cyber-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-cyber-800/50 border-b border-cyber-700">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.action === 'create' ? (
                            <Plus size={15} className="text-teal-400 shrink-0" />
                          ) : file.action === 'modify' ? (
                            <Code size={15} className="text-amber-400 shrink-0" />
                          ) : (
                            <Trash2 size={15} className="text-red-400 shrink-0" />
                          )}
                          <span className="text-sm font-mono truncate">{file.path}</span>
                        </div>
                        {!file.confirmed && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => confirmChange(idx)}
                              className="px-2.5 py-1 rounded-md bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-xs font-medium transition-colors flex items-center gap-1"
                              title="确认更改"
                            >
                              <Check size={13} /> 确认
                            </button>
                            <button
                              onClick={() => rejectChange(idx)}
                              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors flex items-center gap-1"
                              title="撤销更改"
                            >
                              <RotateCcw size={13} /> 撤销
                            </button>
                          </div>
                        )}
                        {file.confirmed && (
                          <span className="text-xs text-teal-400 flex items-center gap-1.5 font-medium">
                            <Check size={13} /> 已应用
                          </span>
                        )}
                      </div>
                      
                      {file.action === 'modify' && file.original && file.modified && (
                        <div className="grid grid-cols-2 gap-px bg-cyber-700">
                          <div className="bg-red-500/5 p-3 overflow-x-auto">
                            <div className="text-xs text-red-400 mb-2 font-semibold">原代码</div>
                            <pre className="text-xs text-scholar-muted font-mono whitespace-pre-wrap">
                              {file.original}
                            </pre>
                          </div>
                          <div className="bg-teal-500/5 p-3 overflow-x-auto">
                            <div className="text-xs text-teal-400 mb-2 font-semibold">修改后</div>
                            <pre className="text-xs text-scholar-text font-mono whitespace-pre-wrap">
                              {file.modified}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {(file.action === 'create') && file.modified && (
                        <div className="p-3 overflow-x-auto">
                          <pre className="text-xs text-scholar-text font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {file.modified}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
              <Bot size={20} className="text-cyber-950" />
            </div>
            <div className="bg-cyber-800 rounded-2xl px-5 py-4">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-cyber-700 bg-cyber-900 shrink-0">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... (Enter 发送，Shift+Enter 换行)"
            className="w-full px-4 py-3 pr-14 bg-cyber-800 border border-cyber-600 rounded-xl text-sm text-scholar-text placeholder-scholar-subtle resize-none focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2.5 bottom-2.5 p-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-cyber-950 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-xs text-scholar-subtle">
            <FileText size={13} />
            <span>支持文件读写、增删改查</span>
          </div>
          <div className="text-xs text-scholar-subtle">
            Ctrl+Shift+A 切换窗口
          </div>
        </div>
      </div>
    </div>
  );
}
