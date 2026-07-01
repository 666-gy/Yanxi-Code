import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Upload, FileCode, X, ZoomIn, ZoomOut, Maximize, Minimize, ArrowLeft, Sparkles, AlertTriangle, Lightbulb, BookOpen, Code2 } from 'lucide-react';

/* ──── 类型定义 ──── */

interface ModuleData {
  id: string;
  name: string;
  type: 'entry' | 'function' | 'class' | 'io' | 'validation' | 'state' | 'utility';
  summary: string;
  code: string;
  calls: string[];
  x: number;
  y: number;
}

interface FocusDetail {
  explanation: string;
  concepts: string[];
  pitfalls: string;
  example: string;
}

interface FileCanvas {
  path: string;
  name: string;
  modules: ModuleData[];
  lastUpdated: number;
}

/* ──── 常量 ──── */

const CANVAS_STORAGE_KEY = 'decipher-canvas-cache-v2';
const MAX_RECENT = 20;

const CARD_W = 340;
const CARD_H_EST = 175;
const CARD_GAP_X = 40;
const CARD_GAP_Y = 30;
const CANVAS_PADDING = 60;

const TYPE_COLORS: Record<ModuleData['type'], { bg: string; border: string; text: string; dot: string }> = {
  entry:     { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6', dot: '#7c3aed' },
  function:  { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', dot: '#3b82f6' },
  class:     { bg: '#eef2ff', border: '#a5b4fc', text: '#4338ca', dot: '#6366f1' },
  io:        { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857', dot: '#10b981' },
  validation:{ bg: '#fffbeb', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' },
  state:     { bg: '#ecfeff', border: '#67e8f9', text: '#0e7490', dot: '#06b6d4' },
  utility:   { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', dot: '#64748b' },
};

const TYPE_LABELS: Record<ModuleData['type'], string> = {
  entry: '入口', function: '函数', class: '类',
  io: '输入输出', validation: '校验', state: '状态', utility: '工具',
};

/* ──── 子组件 ──── */

const YanBoardLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <circle cx="13" cy="13" r="9.5" stroke="#c41e3a" strokeWidth="2.2" />
    <line x1="19.8" y1="19.8" x2="27" y2="27" stroke="#c41e3a" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="13" cy="13" r="3" fill="#c41e3a" opacity="0.18" />
  </svg>
);

/* ──── 代码格式化（行号） ──── */
function formatCode(code: string): { lines: { num: number; text: string }[] } {
  const raw = code.split('\n');
  // 去掉首尾空行
  let start = 0, end = raw.length - 1;
  while (start < raw.length && raw[start].trim() === '') start++;
  while (end >= 0 && raw[end].trim() === '') end--;
  if (start > end) return { lines: [] };
  return {
    lines: raw.slice(start, end + 1).map((text, i) => ({ num: start + i + 1, text })),
  };
}

/* ──── 布局算法 ──── */
function layoutModules(modules: ModuleData[]): ModuleData[] {
  if (modules.length === 0) return modules;

  const nameSet = new Set(modules.map(m => m.name));
  const validCalls = new Map<string, string[]>();
  const incoming = new Map<string, number>();

  for (const m of modules) {
    const targets = m.calls.filter(c => nameSet.has(c));
    validCalls.set(m.name, targets);
    if (!incoming.has(m.name)) incoming.set(m.name, 0);
    for (const t of targets) {
      incoming.set(t, (incoming.get(t) || 0) + 1);
    }
  }

  const depth = new Map<string, number>();
  const queue: string[] = [];

  for (const m of modules) {
    if ((incoming.get(m.name) || 0) === 0) {
      depth.set(m.name, 0);
      queue.push(m.name);
    }
  }
  if (queue.length === 0) {
    depth.set(modules[0].name, 0);
    queue.push(modules[0].name);
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = depth.get(cur)!;
    for (const callee of validCalls.get(cur) || []) {
      if (!depth.has(callee)) {
        depth.set(callee, d + 1);
        queue.push(callee);
      }
    }
  }

  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  for (const m of modules) {
    if (!depth.has(m.name)) {
      maxDepth++;
      depth.set(m.name, maxDepth);
    }
  }

  const layers: Map<number, string[]> = new Map();
  for (const m of modules) {
    const d = depth.get(m.name)!;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(m.name);
  }

  const sortedLayers = [...layers.entries()].sort((a, b) => a[0] - b[0]);

  let maxLayerWidth = 0;
  for (const [, names] of sortedLayers) {
    const w = names.length * (CARD_W + CARD_GAP_X) - CARD_GAP_X;
    maxLayerWidth = Math.max(maxLayerWidth, w);
  }

  const result = modules.map(m => ({ ...m }));

  for (const [layerIdx, names] of sortedLayers) {
    const totalW = names.length * (CARD_W + CARD_GAP_X) - CARD_GAP_X;
    const startX = Math.max(CANVAS_PADDING, (maxLayerWidth - totalW) / 2 + CANVAS_PADDING);

    names.forEach((name, i) => {
      const mod = result.find(r => r.name === name)!;
      mod.x = startX + i * (CARD_W + CARD_GAP_X);
      mod.y = CANVAS_PADDING + layerIdx * (CARD_H_EST + CARD_GAP_Y);
    });
  }

  return result;
}

/* ──── 代码着色（轻量语法高亮） ──── */
function highlightLine(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 字符串
  html = html.replace(/(['"`])(?:(?!\1|\\).|\\.)*?\1/g, '<span class="c-string">$&</span>');
  // 注释
  html = html.replace(/(\/\/.*$|#.*$)/gm, '<span class="c-comment">$&</span>');
  // 关键字
  const kw = /\b(def|function|class|return|if|else|for|while|import|from|export|const|let|var|async|await|try|catch|throw|new|this|super|extends|static|public|private|protected|int|float|double|string|bool|void|True|False|None|null|undefined)\b/g;
  html = html.replace(kw, '<span class="c-kw">$&</span>');
  // 数字
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="c-num">$&</span>');
  // 装饰器
  html = html.replace(/(@\w+)/g, '<span class="c-deco">$&</span>');

  return html;
}

/* ──── 主组件 ──── */

export function CanvasPage() {
  const [allFiles, setAllFiles] = useState<FileCanvas[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('正在读取文件...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 画布视图
  const [view, setView] = useState({ scale: 1, panX: 0, panY: 0 });

  // 聚焦态
  const [focusModuleId, setFocusModuleId] = useState<string | null>(null);
  const [focusDetail, setFocusDetail] = useState<FocusDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // 拖拽状态
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const dragCard = useRef<{ moduleId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const didDragCard = useRef(false);  // 本次操作是否发生了实际拖拽（>3px），用于区分 drag vs click

  const activeFile = activeIndex !== null ? allFiles[activeIndex] : null;
  const focusedMod = focusModuleId ? activeFile?.modules.find(m => m.id === focusModuleId) : null;

  /* ── 初始化 ── */
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

  const persist = (files: FileCanvas[]) => {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({ files }));
    setAllFiles(files);
  };

  /* ── 读取 API 配置 ── */
  const getApiConfig = () => {
    let apiKey = '', apiBase = 'https://api.deepseek.com', model = 'deepseek-chat';
    const saved = localStorage.getItem('decipher-storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        apiKey = parsed.state?.settings?.apiKey || '';
        apiBase = parsed.state?.settings?.apiBase || apiBase;
        model = parsed.state?.settings?.model || model;
      } catch {}
    }
    if (!apiKey) apiKey = localStorage.getItem('decipher-api-key') || '';
    const fb = localStorage.getItem('decipher-api-base');
    if (fb) apiBase = fb;
    const fbModel = localStorage.getItem('decipher-model');
    if (fbModel) model = fbModel;
    return { apiKey, apiBase, model };
  };

  /* ── 新的分析 ── */
  const handleNewAnalysis = () => {
    setActiveIndex(null);
    setFocusModuleId(null);
    setFocusDetail(null);
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

  /* ── 处理文件 ── */
  const processFile = async (filePath: string, fileName: string) => {
    const existing = allFiles.find(f => f.path === filePath);
    if (existing) {
      const idx = allFiles.indexOf(existing);
      setActiveIndex(idx);
      setFocusModuleId(null);
      setFocusDetail(null);
      return;
    }

    setIsLoading(true);
    setLoadingText('正在读取文件...');
    setErrorMessage(null);
    setFocusModuleId(null);
    setFocusDetail(null);

    if (!(window as any).electronAPI) {
      setErrorMessage('Electron API 未初始化');
      setIsLoading(false);
      return;
    }

    try {
      setLoadingText('正在读取文件...');
      const content = await (window as any).electronAPI.readFile(filePath);
      if (!content) {
        setErrorMessage('文件为空或无法读取');
        setIsLoading(false);
        return;
      }

      setLoadingText('正在调用 AI 分析模块结构...');
      let modules = await generateModules(content);

      modules = layoutModules(modules);

      const newCanvas: FileCanvas = {
        path: filePath, name: fileName, modules, lastUpdated: Date.now(),
      };

      const updated = [newCanvas, ...allFiles].slice(0, MAX_RECENT);
      persist(updated);
      setActiveIndex(0);
      setView({ scale: 1, panX: 0, panY: 0 });
      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(`处理文件失败: ${err.message || '未知错误'}`);
      setIsLoading(false);
    }
  };

  /* ── AI 模块化分析 ── */
  const generateModules = async (code: string): Promise<ModuleData[]> => {
    const { apiKey, apiBase, model } = getApiConfig();

    if (!apiKey) return fallbackParse(code);

    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: `你是一个代码分析专家。请将以下代码拆分为逻辑模块（函数、类、主要代码块），并用中文简要解释每个模块的作用。

返回 JSON 数组，每个元素格式：
{
  "name": "模块名（函数名/类名/逻辑块名）",
  "type": "entry|function|class|io|validation|state|utility",
  "summary": "1-2句话中文解释这个模块做什么",
  "code": "该模块的关键代码片段（3-8行）",
  "calls": ["它调用的其他模块名列表"]
}

type 分类规则：
- entry: 程序入口（main、if __name__、顶层执行代码）
- function: 核心业务逻辑函数
- class: 类定义
- io: 文件读写、网络请求、输入输出
- validation: 参数校验、数据验证
- state: 状态管理、变量初始化、配置
- utility: 工具函数、辅助方法

只返回 JSON 数组，不要其他文字。代码：
\`\`\`
${code.slice(0, 8000)}
\`\`\``,
          }],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[YanBoard] API error:', response.status, errText.slice(0, 200));
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const rawModules = JSON.parse(jsonMatch[0]);
        return rawModules.map((m: any, i: number) => ({
          id: `mod-${i}-${Date.now()}`,
          name: m.name || `模块${i + 1}`,
          type: m.type || 'function',
          summary: m.summary || '',
          code: m.code || '',
          calls: m.calls || [],
          x: 0, y: 0,
        }));
      }
      console.warn('[YanBoard] JSON parse failed, raw:', content.slice(0, 300));
      return fallbackParse(code);
    } catch (err: any) {
      console.error('[YanBoard] AI call failed:', err);
      throw err;
    }
  };

  /* ── 无 API 时的 fallback ── */
  const fallbackParse = (code: string): ModuleData[] => {
    const modules: ModuleData[] = [];
    const lines = code.split('\n');
    let currentModule: { name: string; type: ModuleData['type']; lines: string[] } | null = null;

    const flush = () => {
      if (currentModule && currentModule.lines.length > 0) {
        modules.push({
          id: `mod-${modules.length}-${Date.now()}`,
          name: currentModule.name,
          type: currentModule.type,
          summary: `${currentModule.lines.length} 行代码`,
          code: currentModule.lines.slice(0, 6).join('\n'),
          calls: [],
          x: 0, y: 0,
        });
      }
      currentModule = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const funcMatch = trimmed.match(/^(?:async\s+)?(?:def|function)\s+(\w+)/);
      const classMatch = trimmed.match(/^class\s+(\w+)/);
      const mainMatch = trimmed.match(/^if\s+__name__\s*==\s*["']__main__["']/);

      if (funcMatch) {
        flush();
        currentModule = { name: funcMatch[1], type: 'function', lines: [line] };
      } else if (classMatch) {
        flush();
        currentModule = { name: classMatch[1], type: 'class', lines: [line] };
      } else if (mainMatch) {
        flush();
        currentModule = { name: '__main__', type: 'entry', lines: [line] };
      } else if (currentModule) {
        currentModule.lines.push(line);
      }
    }
    flush();

    if (modules.length === 0 && code.trim()) {
      modules.push({
        id: 'mod-0', name: '代码概览', type: 'entry',
        summary: `共 ${lines.filter(l => l.trim()).length} 行有效代码`,
        code: lines.filter(l => l.trim()).slice(0, 8).join('\n'),
        calls: [], x: 0, y: 0,
      });
    }
    return modules;
  };

  /* ── AI 深入解析（聚焦态第二层） ── */
  const fetchDetail = async (mod: ModuleData) => {
    const { apiKey, apiBase, model } = getApiConfig();
    if (!apiKey) {
      setFocusDetail({
        explanation: '请先配置 API Key 以获取 AI 深入解析。',
        concepts: ['API 配置'],
        pitfalls: '在设置页面中填入 DeepSeek API Key 即可使用。',
        example: '// 配置后点击卡片即可获得详情',
      });
      return;
    }

    setIsLoadingDetail(true);
    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: `你是资深代码导师。请用中文详细讲解以下代码模块，面向初学者。

返回 JSON 格式：
{
  "explanation": "逐段讲解代码逻辑，用通俗易懂的中文，200-400字",
  "concepts": ["涉及的关键编程概念1", "概念2", "概念3"],
  "pitfalls": "这段代码的常见错误、注意事项、容易踩的坑",
  "example": "一个简短的使用场景或调用示例代码"
}

只返回 JSON，不要其他文字。

模块名：${mod.name}（类型：${TYPE_LABELS[mod.type]}）
代码：
\`\`\`
${mod.code}
\`\`\``,
          }],
          temperature: 0.4,
        }),
      });

      if (!response.ok) throw new Error(`API ${response.status}`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const detail = JSON.parse(jsonMatch[0]);
        setFocusDetail({
          explanation: detail.explanation || '暂无解释',
          concepts: detail.concepts || [],
          pitfalls: detail.pitfalls || '',
          example: detail.example || '',
        });
      } else {
        setFocusDetail({
          explanation: content.slice(0, 500) || 'AI 返回格式异常',
          concepts: [],
          pitfalls: '',
          example: '',
        });
      }
    } catch (err: any) {
      console.error('[YanBoard] Detail fetch error:', err);
      setFocusDetail({
        explanation: `获取详细解释失败: ${err.message}`,
        concepts: [],
        pitfalls: '请检查网络连接和 API 配置后重试',
        example: '',
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  /* ── 进入聚焦态 ── */
  const handleCardFocus = (moduleId: string) => {
    // 如果发生了拖拽（移动 >3px），跳过聚焦
    if (didDragCard.current) {
      didDragCard.current = false;
      return;
    }
    if (!activeFile) return;
    const mod = activeFile.modules.find(m => m.id === moduleId);
    if (!mod) return;

    setFocusModuleId(moduleId);
    setFocusDetail(null);

    // 动画：画布聚焦到该卡片
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const targetX = mod.x + CARD_W / 2;
      const targetY = mod.y + CARD_H_EST / 2;
      setView({
        scale: 1.3,
        panX: rect.width / 2 - targetX * 1.3,
        panY: rect.height / 4 - targetY * 1.3, // 偏上一点，给详情面板留空间
      });
    }

    // 拉取深入解析
    fetchDetail(mod);
  };

  /* ── 退出聚焦态 ── */
  const handleExitFocus = () => {
    setFocusModuleId(null);
    setFocusDetail(null);
    // 恢复适中视图
    setView({ scale: 1, panX: 0, panY: 0 });
  };

  /* ── 画布交互 ── */

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (focusModuleId) return; // 聚焦态禁止缩放
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView(v => {
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.max(0.15, Math.min(2.5, v.scale * delta));
      const ratio = newScale / v.scale;
      return {
        scale: newScale,
        panX: mx - (mx - v.panX) * ratio,
        panY: my - (my - v.panY) * ratio,
      };
    });
  }, [focusModuleId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (focusModuleId) return;
    if (dragCard.current) return;
    if ((e.target as HTMLElement).closest('.module-card')) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: view.panX, panY: view.panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setView(v => ({ ...v, panX: panStart.current.panX + dx, panY: panStart.current.panY + dy }));
      return;
    }
    if (dragCard.current && activeIndex !== null) {
      const d = dragCard.current;
      const dx = (e.clientX - d.startX) / view.scale;
      const dy = (e.clientY - d.startY) / view.scale;
      // 移动超过 3px 标记为拖拽（区分 drag vs click）
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDragCard.current = true;
      }
      // 拖拽期间仅更新 state，不写 localStorage（性能关键）
      setAllFiles(prev => {
        const updated = [...prev];
        const mods = [...updated[activeIndex].modules];
        const mod = mods.find(m => m.id === d.moduleId);
        if (mod) {
          mod.x = d.origX + dx;
          mod.y = d.origY + dy;
          updated[activeIndex] = { ...updated[activeIndex], modules: mods };
        }
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    isPanning.current = false;
    // 拖拽结束时持久化一次（而非每帧写 localStorage）
    if (dragCard.current) {
      localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({ files: allFiles }));
    }
    dragCard.current = null;
    // didDragCard 在下一次 onMouseDown 时重置，这里先不清，因为 onClick 在 mouseup 之后触发
  };

  const handleCardDragStart = (e: React.MouseEvent, moduleId: string) => {
    if (focusModuleId) return;
    e.stopPropagation();
    if (activeIndex === null) return;
    const mod = allFiles[activeIndex].modules.find(m => m.id === moduleId);
    if (!mod) return;
    didDragCard.current = false;  // 重置拖拽标记
    dragCard.current = {
      moduleId, startX: e.clientX, startY: e.clientY, origX: mod.x, origY: mod.y,
    };
  };

  const zoomIn = () => setView(v => ({ ...v, scale: Math.min(2.5, v.scale * 1.25) }));
  const zoomOut = () => setView(v => ({ ...v, scale: Math.max(0.15, v.scale * 0.8) }));
  const zoomReset = () => setView({ scale: 1, panX: 0, panY: 0 });
  const zoomFit = () => {
    if (activeIndex === null || allFiles[activeIndex].modules.length === 0) return;
    const mods = allFiles[activeIndex].modules;
    const minX = Math.min(...mods.map(m => m.x));
    const maxX = Math.max(...mods.map(m => m.x + CARD_W));
    const minY = Math.min(...mods.map(m => m.y));
    const maxY = Math.max(...mods.map(m => m.y + CARD_H_EST));
    const cw = maxX - minX + 80;
    const ch = maxY - minY + 80;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = (rect.width - 80) / cw;
    const scaleY = (rect.height - 80) / ch;
    const scale = Math.min(scaleX, scaleY, 1.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ scale, panX: rect.width / 2 - cx * scale, panY: rect.height / 2 - cy * scale });
  };

  /* ── 移除文件 ── */
  const handleRemoveFile = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const updated = allFiles.filter((_, i) => i !== idx);
    persist(updated);
    if (activeIndex === idx) {
      setActiveIndex(updated.length > 0 ? 0 : null);
      setFocusModuleId(null);
      setFocusDetail(null);
    } else if (activeIndex !== null && activeIndex > idx) {
      setActiveIndex(activeIndex - 1);
    }
  };

  /* ── 计算 SVG 连线 ── */
  const computeConnections = (modules: ModuleData[]) => {
    const connections: { from: string; to: string; path: string }[] = [];
    const nameMap = new Map(modules.map(m => [m.name, m]));

    for (const mod of modules) {
      for (const calleeName of mod.calls) {
        const callee = nameMap.get(calleeName);
        if (!callee) continue;
        const x1 = mod.x + CARD_W / 2;
        const y1 = mod.y + CARD_H_EST;
        const x2 = callee.x + CARD_W / 2;
        const y2 = callee.y;
        const midY = (y1 + y2) / 2;
        const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        connections.push({ from: mod.name, to: calleeName, path: d });
      }
    }
    return connections;
  };

  const connections = activeFile ? computeConnections(activeFile.modules) : [];

  /* ════════════════════════════════════════════
     渲染：聚焦态详情面板
     ════════════════════════════════════════════ */

  const renderFocusOverlay = () => {
    if (!focusedMod) return null;
    const colors = TYPE_COLORS[focusedMod.type];
    const codeLines = formatCode(focusedMod.code);

    return (
      <div className="absolute inset-0 z-50 flex flex-col overflow-hidden" style={{ background: 'rgba(26,26,46,0.55)' }}>
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100 shrink-0">
          <button
            onClick={handleExitFocus}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm text-gray-600 transition-colors"
          >
            <ArrowLeft size={17} />
            <span>返回总览</span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: colors.bg, color: colors.text }}>
              {TYPE_LABELS[focusedMod.type]}
            </span>
            <span className="text-base font-semibold text-[#1a1a2e]">{focusedMod.name}</span>
          </div>
          <div className="w-20" /> {/* spacer */}
        </div>

        {/* 内容区：左右两栏 */}
        <div className="flex-1 overflow-hidden flex">
          {/* ── 左：代码区 ── */}
          <div className="w-[45%] flex flex-col bg-[#181825] border-r border-white/5">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
              <Code2 size={13} className="text-[#a6adc8]" />
              <span className="text-xs text-[#a6adc8] font-medium tracking-wide">源代码</span>
              <span className="text-[10px] text-[#585b70] ml-auto font-mono">{codeLines.lines.length} 行</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse font-mono text-sm leading-relaxed">
                <tbody>
                  {codeLines.lines.map((line, i) => (
                    <tr
                      key={i}
                      className="hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="text-right px-3 py-[1px] text-[#585b70] select-none border-r border-white/[0.05] w-12 text-xs align-top">
                        {line.num}
                      </td>
                      <td className="px-4 py-[1px] text-[#cdd6f4] align-top">
                        <code
                          className="whitespace-pre-wrap break-all"
                          dangerouslySetInnerHTML={{ __html: highlightLine(line.text) }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 右：解析区 ── */}
          <div className="flex-1 flex flex-col bg-white overflow-y-auto scrollbar-thin">
            {/* 概述 */}
            {focusedMod.summary && (
              <div className="px-6 pt-5 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={16} className="text-[#c41e3a]" />
                  <span className="text-sm font-semibold text-[#1a1a2e]">模块概述</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{focusedMod.summary}</p>
              </div>
            )}

            {/* 深入解析 */}
            <div className="px-6 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-sm font-semibold text-[#1a1a2e]">深入解析</span>
              </div>

              {isLoadingDetail ? (
                <div className="flex items-center gap-3 py-6">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-[#c41e3a] animate-spin" />
                  <span className="text-sm text-gray-400">AI 正在深入分析...</span>
                </div>
              ) : focusDetail ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {focusDetail.explanation}
                  </p>

                  {/* 概念标签 */}
                  {focusDetail.concepts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb size={14} className="text-amber-400" />
                        <span className="text-xs font-medium text-gray-500">关键概念</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {focusDetail.concepts.map((c, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: '#eff6ff', color: '#2563eb' }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 常见陷阱 */}
                  {focusDetail.pitfalls && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle size={14} className="text-orange-400" />
                        <span className="text-xs font-medium text-gray-500">常见陷阱</span>
                      </div>
                      <div className="bg-orange-50 rounded-lg px-3.5 py-2.5 border border-orange-100">
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                          {focusDetail.pitfalls}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 使用示例 */}
                  {focusDetail.example && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Code2 size={14} className="text-green-500" />
                        <span className="text-xs font-medium text-gray-500">使用示例</span>
                      </div>
                      <div className="rounded-lg overflow-hidden bg-[#1e1e2e]">
                        <pre className="p-3.5 text-[12px] leading-relaxed text-[#cdd6f4] font-mono whitespace-pre-wrap overflow-x-auto">
                          {focusDetail.example}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 调用关系 */}
            {focusedMod.calls.length > 0 && (
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500">调用关系</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {focusedMod.calls.map(c => (
                    <span
                      key={c}
                      className="text-xs px-2.5 py-1 rounded-full font-mono"
                      style={{ background: '#f1f5f9', color: '#475569' }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════
     渲染：总览幕布
     ════════════════════════════════════════════ */

  return (
    <div className="h-full w-full flex bg-[#f8f9fc] text-[#1a1a2e] overflow-hidden">
      {/* ══════ 左侧边栏 ══════ */}
      <aside className="w-56 h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
          <YanBoardLogo />
          <span className="text-lg font-semibold tracking-wide text-[#1a1a2e]">Yan Board</span>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={handleNewAnalysis}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f4f5f7] hover:bg-[#ebedf2] text-[#4a4b5c] font-medium text-sm transition-colors"
          >
            <Plus size={17} className="text-[#c41e3a]" />
            新的分析
          </button>
        </div>

        <div className="mx-4 border-t border-gray-100" />

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
                  onClick={() => { setActiveIndex(idx); setFocusModuleId(null); setFocusDetail(null); setErrorMessage(null); }}
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
        {/* Tab 栏 */}
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
                <span onClick={() => { setActiveIndex(idx); setFocusModuleId(null); setFocusDetail(null); setErrorMessage(null); }} className="flex items-center gap-1.5 cursor-pointer">
                  <FileCode size={13} />
                  <span className="max-w-[180px] truncate">{file.name}</span>
                </span>
                <button onClick={() => setActiveIndex(null)} className="ml-1.5 p-0.5 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0" title="关闭面板">
                  <X size={12} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
            <button onClick={handleOpenFile} className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-400 hover:text-[#c41e3a] hover:bg-gray-50 rounded-lg transition-colors ml-1" title="添加文件">
              <Plus size={15} />
            </button>
          </div>
        )}

        {/* 画布主体 */}
        <div
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden select-none ${focusModuleId ? 'cursor-auto' : 'cursor-grab active:cursor-grabbing'}`}
          style={{ background: '#fafbfd' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 错误提示 */}
          {errorMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-red-50 border border-red-100 rounded-xl shadow-sm flex items-center gap-3">
              <span className="text-sm text-red-600">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600"><X size={15} /></button>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-20 py-16 flex flex-col items-center">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#c41e3a] animate-spin" />
                  <div className="absolute inset-2 rounded-full border-[2px] border-transparent border-b-[#c41e3a] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
                <p className="text-gray-700 text-base font-medium">{loadingText}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#c41e3a] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#c41e3a] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#c41e3a] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ 聚焦态 ═══ */}
          {focusModuleId && renderFocusOverlay()}

          {/* ═══ 总览幕布 / 空状态 ═══ */}
          {activeFile && activeFile.modules.length > 0 ? (
            <>
              {/* 背景点阵 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.35 }}>
                <defs>
                  <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="12" cy="12" r="1" fill="#cbd5e1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dot-grid)" />
              </svg>

              {/* 变换容器 */}
              <div
                className="absolute origin-top-left transition-all duration-500 ease-out"
                style={{
                  transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.scale})`,
                  opacity: focusModuleId ? 0.25 : 1,
                  pointerEvents: focusModuleId ? 'none' : 'auto',
                  width: 8000, height: 8000,
                }}
              >
                {/* 模块卡片 */}
                {activeFile.modules.map(mod => {
                  const colors = TYPE_COLORS[mod.type];
                  const fmt = formatCode(mod.code);
                  return (
                    <div
                      key={mod.id}
                      className="module-card absolute rounded-xl border shadow-sm transition-all duration-300 group"
                      style={{
                        left: mod.x, top: mod.y, width: CARD_W,
                        background: 'white',
                        borderColor: colors.border,
                        cursor: 'pointer',
                      }}
                      onMouseDown={(e) => handleCardDragStart(e, mod.id)}
                      onClick={() => handleCardFocus(mod.id)}
                    >
                      {/* 类型标签 + 名称 */}
                      <div className="flex items-center gap-2 px-3.5 pt-3 pb-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {TYPE_LABELS[mod.type]}
                        </span>
                        <span className="text-sm font-semibold text-[#1a1a2e] truncate flex-1 ml-1">
                          {mod.name}
                        </span>
                      </div>

                      {/* 概要 */}
                      {mod.summary && (
                        <p className="px-3.5 pb-2 text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {mod.summary}
                        </p>
                      )}

                      {/* 代码块 */}
                      {mod.code && fmt.lines.length > 0 && (
                        <div className="mx-3 mb-3 rounded-lg overflow-hidden border border-[#313244]" style={{ background: '#1e1e2e' }}>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#313244]/50 bg-[#181825]">
                            <Code2 size={10} className="text-[#585b70]" />
                            <span className="text-[10px] text-[#585b70] font-medium">源代码</span>
                            <span className="ml-auto text-[10px] text-[#45475a]">{fmt.lines.length} 行</span>
                          </div>
                          <div className="p-2.5 max-h-[110px] overflow-y-auto scrollbar-thin">
                            {fmt.lines.slice(0, 8).map((line, i) => (
                              <div key={i} className="flex text-[11px] leading-5">
                                <span className="w-7 text-right pr-2 text-[#585b70] select-none shrink-0">{line.num}</span>
                                <code
                                  className="text-[#cdd6f4] whitespace-pre-wrap break-all flex-1"
                                  dangerouslySetInnerHTML={{ __html: highlightLine(line.text) }}
                                />
                              </div>
                            ))}
                            {fmt.lines.length > 8 && (
                              <div className="text-[10px] text-[#585b70] mt-1 pl-7">... 还有 {fmt.lines.length - 8} 行</div>
                            )}
                          </div>
                          {/* 悬浮提示 */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 py-1.5 bg-[#181825] border-t border-[#313244]/50">
                            <Sparkles size={11} className="text-amber-400" />
                            <span className="text-[10px] text-[#a6adc8]">点击查看详细解析</span>
                          </div>
                        </div>
                      )}

                      {/* 调用关系 */}
                      {mod.calls.length > 0 && (
                        <div className="px-3.5 pb-3 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-300">调用 →</span>
                          {mod.calls.map(c => (
                            <span
                              key={c}
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                              style={{ background: '#f1f5f9', color: '#64748b' }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* SVG 连线 */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: 8000, height: 8000, zIndex: 0 }}>
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                    </marker>
                  </defs>
                  {connections.map((conn, i) => (
                    <path
                      key={`${conn.from}-${conn.to}-${i}`}
                      d={conn.path}
                      fill="none" stroke="#94a3b8" strokeWidth="1.5"
                      strokeDasharray="6 4" opacity="0.5"
                      markerEnd="url(#arrowhead)"
                    />
                  ))}
                </svg>
              </div>

              {/* 缩放控件 */}
              {!focusModuleId && (
                <div className="absolute bottom-5 right-5 flex items-center gap-1.5 bg-white rounded-xl shadow-md border border-gray-100 px-2 py-1.5 z-50">
                  <button onClick={zoomOut} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="缩小">
                    <ZoomOut size={16} className="text-gray-500" />
                  </button>
                  <span className="text-xs text-gray-400 min-w-[42px] text-center font-mono select-none">
                    {Math.round(view.scale * 100)}%
                  </span>
                  <button onClick={zoomIn} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="放大">
                    <ZoomIn size={16} className="text-gray-500" />
                  </button>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  <button onClick={zoomFit} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="适应画布">
                    <Maximize size={14} className="text-gray-500" />
                  </button>
                  <button onClick={zoomReset} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="重置视图">
                    <Minimize size={14} className="text-gray-500" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ── 空状态 ── */
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-16 max-w-xl w-full mx-6">
                <div className="text-center mb-12">
                  <div className="inline-flex mb-5 scale-125"><YanBoardLogo /></div>
                  <h2 className="text-3xl font-semibold text-[#1a1a2e] mb-2">Yan Board</h2>
                  <p className="text-sm text-gray-400">探索代码世界，更上一层</p>
                </div>
                <button
                  onClick={handleOpenFile}
                  className="w-full flex flex-col items-center justify-center gap-4 py-14 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#c41e3a] hover:bg-red-50/30 transition-all group"
                >
                  <div className="w-20 h-20 rounded-full bg-[#f4f5f7] flex items-center justify-center group-hover:bg-red-50 transition-colors">
                    <Upload size={36} className="text-[#c41e3a]" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-[#1a1a2e] mb-1">上传文件</p>
                    <p className="text-sm text-gray-400">支持 Python、JavaScript、Java、C/C++ 等</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════ 全局样式 ══════ */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width:5px; height:5px; }
        .scrollbar-thin::-webkit-scrollbar-track { background:transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background:#9ca3af; }

        .c-kw { color: #cba6f7; }
        .c-string { color: #a6e3a1; }
        .c-comment { color: #6c7086; font-style: italic; }
        .c-num { color: #fab387; }
        .c-deco { color: #f9e2af; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
