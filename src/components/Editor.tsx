import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { detectLanguage, getMonacoLanguage, extractCodeBlock } from '../utils/codeExtractor';
import { useDebounce } from '../hooks/useDebounce';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { useTheme } from '../hooks/useTheme';
import logoUrl from '/logo.svg';

export function CodeEditor() {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const {
    activeFilePath,
    fileContents,
    setFileContent,
    setCursorPosition,
    settings,
    setSelectedCode,
    translateEnabled,
    openTabs,
    toggleTranslatePanel,
    translatePanelOpen,
  } = useStore();
  
  const { translate } = useDeepSeek();
  const { monacoTheme } = useTheme();

  // 获取当前 tab 的内容
  const activeTab = openTabs.find(t => t.path === activeFilePath);
  const currentContent = activeFilePath ? fileContents[activeFilePath] || '' : '';
  const language = activeTab?.language || 'plaintext';
  const monacoLang = getMonacoLanguage(language);

  const debouncedTranslate = useDebounce((code: string, line: number, lang: string) => {
    if (!settings.autoTranslate || !settings.apiKey || !translateEnabled) return;
    const block = extractCodeBlock(code, line, lang);
    if (block.content.trim()) {
      translate(block.content, lang, 'auto');
    }
  }, settings.debounceMs);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    editor.onDidChangeCursorSelection((e: any) => {
      const text = editor.getModel().getValueInRange(e.selection);
      setSelectedCode(text || null);
    });

    // 添加右键菜单「翻译此处」
    editor.addAction({
      id: 'translate-selection',
      label: '翻译此处',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: function(ed: any) {
        const selection = ed.getModel().getValueInRange(ed.getSelection());
        if (!selection || !selection.trim()) return;
        
        if (!translatePanelOpen) {
          toggleTranslatePanel();
        }
        
        const activeTab = openTabs.find(t => t.path === activeFilePath);
        const language = activeTab?.language || 'plaintext';
        translate(selection, language, 'deep');
      },
    });
  };

  // 主题变化时同步 Monaco 主题
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  const handleChange = (value: string | undefined) => {
    if (activeFilePath && value !== undefined) {
      setFileContent(activeFilePath, value);
      
      const editor = editorRef.current;
      if (editor && translateEnabled) {
        const position = editor.getPosition();
        if (position && value.trim()) {
          debouncedTranslate(value, position.lineNumber, language);
        }
      }
    }
  };

  // 文件切换时触发翻译
  useEffect(() => {
    if (editorRef.current && activeFilePath && currentContent.trim() && translateEnabled) {
      const position = editorRef.current.getPosition();
      if (position && settings.autoTranslate && settings.apiKey) {
        const block = extractCodeBlock(currentContent, position.lineNumber, language);
        if (block.content.trim()) {
          translate(block.content, language, 'auto');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilePath]);

  // 没有 tab 时的空状态
  if (openTabs.length === 0 || !activeFilePath) {
    return (
      <div className="h-full flex items-center justify-center bg-cyber-900">
        <div className="text-center">
          <img src={logoUrl} alt="Yanxi Code" className="w-24 h-24 mx-auto mb-6" />
          <p className="text-scholar-muted text-xl italic">所想即所写，所写即所现。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="h-8 bg-cyber-950 border-b border-cyber-700 flex items-center px-4">
        <span className="text-sm text-scholar-text">{activeTab?.name}</span>
        {activeTab?.modified && (
          <span className="ml-2 text-xs text-amber-400">● 已修改</span>
        )}
        <span className="ml-3 text-xs text-scholar-subtle uppercase tracking-wider">
          {language}
        </span>
      </div>
      <div className="h-[calc(100%-2rem)]">
        <Editor
          key={monacoTheme}
          height="100%"
          language={monacoLang}
          value={currentContent}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme={monacoTheme}
          options={{
            fontSize: 14,
            fontFamily: 'Consolas, "JetBrains Mono", "Fira Code", monospace',
            fontLigatures: true,
            lineHeight: 21,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
          }}
        />
      </div>
    </div>
  );
}