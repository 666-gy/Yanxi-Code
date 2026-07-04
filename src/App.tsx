import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { FileTree } from './components/FileTree';
import { TabBar } from './components/TabBar';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { NewFileDialog } from './components/NewFileDialog';
import { useStore } from './store/useStore';
import { useTheme } from './hooks/useTheme';

const TerminalPanel = lazy(() => import('./components/TerminalPanel').then((module) => ({ default: module.TerminalPanel })));
const CanvasPage = lazy(() => import('./pages/CanvasPage').then((module) => ({ default: module.CanvasPage })));
const CodeEditor = lazy(() => import('./components/Editor').then((module) => ({ default: module.CodeEditor })));
const TranslatePanel = lazy(() => import('./components/TranslatePanel').then((module) => ({ default: module.TranslatePanel })));

function MainApp() {
  const { sidebarOpen, settings, terminalOpen } = useStore();
  const openTabs = useStore((state) => state.openTabs);
  useTheme(); // 初始化主题

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [terminalLoaded, setTerminalLoaded] = useState(terminalOpen);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  useEffect(() => {
    if (terminalOpen) setTerminalLoaded(true);
  }, [terminalOpen]);

  useEffect(() => {
    window.electronAPI?.setDirty(openTabs.some((tab) => tab.modified));
  }, [openTabs]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = sidebarWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(180, Math.min(500, resizeStartWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 处理 Electron 菜单快捷键
  useEffect(() => {
    if (!window.electronAPI) return;

    return window.electronAPI.onMenuAction((action: string) => {
      switch (action) {
        case 'menu-open-folder':
          // 触发打开文件夹
          (document.querySelector('[title="打开文件夹"]') as HTMLElement)?.click();
          break;
        case 'menu-new-file':
          useStore.getState().openNewFileDialog();
          break;
        case 'menu-save': {
          const { activeFilePath, fileContents, workspacePath } = useStore.getState();
          if (activeFilePath && workspacePath && window.electronAPI) {
            const content = fileContents[activeFilePath];
            window.electronAPI.saveFile(activeFilePath, content).then((success: boolean) => {
              if (success) {
                useStore.getState().markModified(activeFilePath, false);
              }
            });
          }
          break;
        }
      }
    });
  }, []);

  // 将旧版明文密钥迁移到 Electron safeStorage，并仅在当前会话保留解密值。
  useEffect(() => {
    if (!window.electronAPI) return;
    let cancelled = false;
    const migrate = async () => {
      const state = useStore.getState();
      const legacyKey = state.settings.apiKey || localStorage.getItem('decipher-api-key') || '';
      if (legacyKey) {
        const result = await window.electronAPI!.secrets.saveApiKey(legacyKey);
        localStorage.removeItem('decipher-api-key');
        state.updateSettings({ apiKey: legacyKey });
        if (!result.success) console.warn(result.error);
        return;
      }
      const result = await window.electronAPI!.secrets.loadApiKey();
      if (!cancelled && result.success && result.apiKey) {
        useStore.getState().updateSettings({ apiKey: result.apiKey });
      }
    };
    void migrate();
    return () => { cancelled = true; };
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            if (useStore.getState().workspacePath) {
              e.preventDefault();
              useStore.getState().openNewFileDialog();
            }
            break;
          case 'o':
            e.preventDefault();
            (document.querySelector('[title="打开文件夹"]') as HTMLElement)?.click();
            break;
          case 's': {
            e.preventDefault();
            const { activeFilePath, fileContents, workspacePath, markModified } = useStore.getState();
            if (activeFilePath && workspacePath && window.electronAPI) {
              const content = fileContents[activeFilePath];
              window.electronAPI.saveFile(activeFilePath, content).then((success: boolean) => {
                if (success) {
                  markModified(activeFilePath, false);
                }
              });
            }
            break;
          }
          case 'w': {
            if (useStore.getState().activeFilePath) {
              e.preventDefault();
              const state = useStore.getState();
              const tab = state.openTabs.find((item) => item.path === state.activeFilePath);
              if (!tab?.modified || window.confirm('该文件有未保存的修改，确定关闭吗？')) {
                state.closeTab(state.activeFilePath!);
              }
            }
            break;
          }
          case '`':
            e.preventDefault();
            useStore.getState().toggleTerminal();
            break;
          case 'c':
            if (e.shiftKey && window.electronAPI) {
              e.preventDefault();
              window.electronAPI.toggleCanvasWindow();
            }
            break;
          case 'f5':
            e.preventDefault();
            useStore.getState().requestRun();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-cyber-900 text-scholar-text overflow-hidden relative">
      {/* 背景图 */}
      {settings.backgroundImage && (
        <div
          className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${settings.backgroundImage})`,
            opacity: settings.backgroundOpacity,
          }}
        />
      )}
      <div className="relative z-10">
        <Header />
      </div>
      
      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
        {sidebarOpen && (
          <aside
            className="bg-transparent border-r border-cyber-700/30 shrink-0 overflow-hidden"
            style={{ width: `${sidebarWidth}px` }}
          >
            <FileTree />
          </aside>
        )}
        
        {sidebarOpen && (
          <div
            className={`w-1 cursor-col-resize shrink-0 transition-colors ${
              isResizing ? 'bg-amber-500' : 'bg-transparent hover:bg-cyber-600'
            }`}
            onMouseDown={handleResizeStart}
            title="拖拽调整宽度"
          />
        )}
        
        <main className="flex-1 overflow-hidden min-w-[200px] flex flex-col">
          <TabBar />
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={null}><CodeEditor /></Suspense>
          </div>
          {terminalLoaded && (
            <Suspense fallback={null}>
              <TerminalPanel />
            </Suspense>
          )}
        </main>
        
        <Suspense fallback={null}><TranslatePanel /></Suspense>
      </div>
      
      <div className="relative z-10">
        <StatusBar />
      </div>
      
      <SettingsModal />
      <NewFileDialog />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/canvas" element={<Suspense fallback={null}><CanvasPage /></Suspense>} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </HashRouter>
  );
}
