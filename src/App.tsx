import { useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { FileTree } from './components/FileTree';
import { TabBar } from './components/TabBar';
import { CodeEditor } from './components/Editor';
import { TranslatePanel } from './components/TranslatePanel';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { NewFileDialog } from './components/NewFileDialog';
import { CanvasPage } from './pages/CanvasPage';
import { useStore } from './store/useStore';
import { useTheme } from './hooks/useTheme';

function MainApp() {
  const { sidebarOpen, settings } = useStore();
  useTheme(); // 初始化主题

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

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

    window.electronAPI.onMenuAction((event: any, action: string) => {
      switch (action) {
        case 'menu-open-folder':
          // 触发打开文件夹
          (document.querySelector('[title="打开文件夹"]') as HTMLElement)?.click();
          break;
        case 'menu-new-file':
          useStore.getState().openNewFileDialog();
          break;
        case 'menu-save':
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
    });

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
          case 's':
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
          case 'w':
            if (useStore.getState().activeFilePath) {
              e.preventDefault();
              useStore.getState().closeTab(useStore.getState().activeFilePath!);
            }
            break;
          case 'c':
            if (e.shiftKey && window.electronAPI) {
              e.preventDefault();
              window.electronAPI.toggleCanvasWindow();
            }
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
            <CodeEditor />
          </div>
        </main>
        
        <TranslatePanel />
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
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </HashRouter>
  );
}