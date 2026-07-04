import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Play, RotateCcw, Trash2, X, TerminalSquare } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../store/useStore';

export function TerminalPanel() {
  const {
    terminalOpen,
    toggleTerminal,
    workspacePath,
    activeFilePath,
    openTabs,
    fileContents,
    markModified,
    runRequest,
  } = useStore();
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string | null>(null);
  const [shellName, setShellName] = useState('');
  const [height, setHeight] = useState(240);
  const [starting, setStarting] = useState(false);

  const writeNotice = useCallback((text: string, error = false) => {
    terminalRef.current?.writeln(`\r\n\u001b[${error ? '31' : '33'}m${text}\u001b[0m`);
  }, []);

  const start = useCallback(async () => {
    if (!workspacePath || !window.electronAPI || !hostRef.current || starting) return;
    if (terminalIdRef.current) {
      fitRef.current?.fit();
      terminalRef.current?.focus();
      return;
    }
    if (!terminalRef.current) {
      const terminal = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: 'Consolas, "JetBrains Mono", monospace',
        fontSize: 13,
        scrollback: 5000,
        theme: { background: '#14141b', foreground: '#e8e8ed', cursor: '#f59e0b' },
      });
      const fit = new FitAddon();
      terminal.loadAddon(fit);
      terminal.open(hostRef.current);
      terminal.onData((data) => {
        if (terminalIdRef.current) window.electronAPI?.terminal.write(terminalIdRef.current, data);
      });
      terminalRef.current = terminal;
      fitRef.current = fit;
    }
    setStarting(true);
    try {
      fitRef.current?.fit();
      const dimensions = terminalRef.current;
      const result = await window.electronAPI.terminal.start({
        cwd: workspacePath,
        cols: dimensions?.cols || 80,
        rows: dimensions?.rows || 24,
      });
      terminalIdRef.current = result.terminalId;
      setShellName(result.shell);
      terminalRef.current?.focus();
    } catch (error) {
      writeNotice(error instanceof Error ? error.message : '终端启动失败', true);
    } finally {
      setStarting(false);
    }
  }, [starting, workspacePath, writeNotice]);

  const restart = useCallback(async () => {
    if (terminalIdRef.current) await window.electronAPI?.terminal.dispose(terminalIdRef.current);
    terminalIdRef.current = null;
    terminalRef.current?.reset();
    await start();
  }, [start]);

  const runCurrent = useCallback(async () => {
    if (!activeFilePath || !window.electronAPI) {
      writeNotice('请先打开一个可运行的代码文件。', true);
      return;
    }
    const activeTab = openTabs.find((tab) => tab.path === activeFilePath);
    if (activeTab?.modified) {
      if (!window.confirm('当前文件尚未保存。是否保存并运行？')) return;
      const saved = await window.electronAPI.saveFile(activeFilePath, fileContents[activeFilePath] ?? '');
      if (!saved) {
        writeNotice('保存失败，已取消运行。', true);
        return;
      }
      markModified(activeFilePath, false);
    }
    if (!terminalIdRef.current) await start();
    const terminalId = terminalIdRef.current;
    if (!terminalId) return;
    try {
      const plan = await window.electronAPI.terminal.prepareRun(activeFilePath);
      if (!plan.supported || !plan.id) {
        writeNotice(plan.explanation, true);
        return;
      }
      const approved = window.confirm(`${plan.label}\n\n${plan.commandPreview}\n\n${plan.explanation}\n\n是否执行？`);
      if (!approved) return;
      await window.electronAPI.terminal.executeRun(plan.id, terminalId);
      terminalRef.current?.focus();
    } catch (error) {
      writeNotice(error instanceof Error ? error.message : '运行失败', true);
    }
  }, [activeFilePath, fileContents, markModified, openTabs, start, writeNotice]);

  useEffect(() => {
    if (!window.electronAPI) return;
    const offData = window.electronAPI.terminal.onData(({ terminalId, data }) => {
      if (terminalId === terminalIdRef.current) terminalRef.current?.write(data);
    });
    const offExit = window.electronAPI.terminal.onExit(({ terminalId, exitCode }) => {
      if (terminalId === terminalIdRef.current) {
        terminalIdRef.current = null;
        writeNotice(`终端已退出（代码 ${exitCode}）`);
      }
    });
    return () => {
      offData();
      offExit();
    };
  }, [writeNotice]);

  useEffect(() => {
    if (terminalOpen) void start();
    requestAnimationFrame(() => fitRef.current?.fit());
  }, [height, start, terminalOpen]);

  useEffect(() => {
    if (runRequest > 0) void runCurrent();
  }, [runRequest, runCurrent]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      fitRef.current?.fit();
      if (terminalIdRef.current && terminalRef.current) {
        window.electronAPI?.terminal.resize(terminalIdRef.current, terminalRef.current.cols, terminalRef.current.rows);
      }
    });
    if (hostRef.current) observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (terminalIdRef.current) void window.electronAPI?.terminal.dispose(terminalIdRef.current);
    terminalRef.current?.dispose();
  }, []);

  const beginResize = (event: React.MouseEvent) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const move = (e: MouseEvent) => setHeight(Math.max(140, Math.min(window.innerHeight * 0.6, startHeight + startY - e.clientY)));
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <section className={`${terminalOpen ? 'flex' : 'hidden'} shrink-0 flex-col border-t border-cyber-700 bg-cyber-900`} style={{ height }}>
      <div className="h-1 cursor-row-resize hover:bg-amber-500" onMouseDown={beginResize} />
      <div className="h-8 px-3 flex items-center justify-between border-b border-cyber-700">
        <div className="flex items-center gap-2 text-xs text-scholar-muted">
          <TerminalSquare size={14} className="text-amber-400" />
          <span>终端</span>
          {shellName && <span className="text-scholar-subtle">· {shellName}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={runCurrent} className="p-1 hover:text-amber-400" title="运行当前文件 (Ctrl+F5)"><Play size={13} /></button>
          <button onClick={() => terminalRef.current?.clear()} className="p-1 hover:text-amber-400" title="清屏"><Trash2 size={13} /></button>
          <button onClick={restart} className="p-1 hover:text-amber-400" title="重启终端"><RotateCcw size={13} /></button>
          <button onClick={toggleTerminal} className="p-1 hover:text-amber-400" title="关闭终端"><X size={13} /></button>
        </div>
      </div>
      <div ref={hostRef} className="flex-1 min-h-0 px-2 py-1 overflow-hidden" />
    </section>
  );
}
