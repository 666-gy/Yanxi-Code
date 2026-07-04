import { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store/useStore';
import { getMonacoLanguage, extractSingleLine } from '../utils/codeExtractor';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { useTheme } from '../hooks/useTheme';
import logoUrl from '/logo.svg';
import '../monaco';

export function CodeEditor() {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const translateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mdPreview, setMdPreview] = useState(false);
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
  const settingsRef = useRef(settings);
  const translateEnabledRef = useRef(translateEnabled);
  const translateRef = useRef(translate);
  settingsRef.current = settings;
  translateEnabledRef.current = translateEnabled;
  translateRef.current = translate;

  // 获取当前 tab 的内容
  const activeTab = openTabs.find(t => t.path === activeFilePath);
  const currentContent = activeFilePath ? fileContents[activeFilePath] || '' : '';
  const language = activeTab?.language || 'plaintext';
  const monacoLang = getMonacoLanguage(language);
  const lastLineRef = useRef<number>(1);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.style.backgroundColor = 'transparent';
      const lines = domNode.querySelectorAll('.monaco-editor-background, .editor-background');
      lines.forEach((el: any) => {
        el.style.backgroundColor = 'transparent';
      });
    }

    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });

      // 光标换行时触发翻译上一行
      if (
        settingsRef.current.autoTranslate &&
        settingsRef.current.apiKey &&
        translateEnabledRef.current &&
        e.position.lineNumber !== lastLineRef.current
      ) {
        const prevLine = lastLineRef.current;
        lastLineRef.current = e.position.lineNumber;

        const content = editor.getValue();
        const { content: lineContent } = extractSingleLine(content, prevLine, language);
        if (lineContent.trim()) {
          if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
          translateTimerRef.current = setTimeout(() => {
            translateRef.current(lineContent.trim(), language, 'auto');
          }, settingsRef.current.debounceMs);
        }
      }
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

    // 添加右键菜单「查看预览/恢复编辑」(仅MD文件)
    const activeTabForMenu = openTabs.find(t => t.path === activeFilePath);
    if (activeTabForMenu?.language === 'markdown') {
      editor.addAction({
        id: 'md-preview',
        label: mdPreview ? '恢复编辑' : '查看预览',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 2.0,
        run: function() {
          setMdPreview(!mdPreview);
        },
      });
    }
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
    }
  };

  // 文件切换时重置预览状态
  useEffect(() => {
    setMdPreview(false);
  }, [activeFilePath]);

  useEffect(() => () => {
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
  }, []);

  // 文件切换时重置行号并触发当前行翻译
  useEffect(() => {
    if (editorRef.current && activeFilePath && currentContent.trim() && translateEnabled) {
      const position = editorRef.current.getPosition();
      lastLineRef.current = position?.lineNumber || 1;
      if (position && settings.autoTranslate && settings.apiKey) {
        const { content: lineContent } = extractSingleLine(currentContent, position.lineNumber, language);
        if (lineContent.trim()) {
          translate(lineContent.trim(), language, 'auto');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilePath]);

  // 没有 tab 时的空状态
  if (openTabs.length === 0 || !activeFilePath) {
    return (
      <div className="h-full flex items-center justify-center bg-transparent">
        <div className="text-center">
          <img src={logoUrl} alt="Yanxi Code" className="w-24 h-24 mx-auto mb-6" />
          <p className="text-scholar-muted text-xl italic">所想即所写，所写即所现。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="h-8 bg-transparent border-b border-cyber-700/30 flex items-center px-4">
        <span className="text-sm text-scholar-text">{activeTab?.name}</span>
        {activeTab?.modified && (
          <span className="ml-2 text-xs text-amber-400">● 已修改</span>
        )}
        <span className="ml-3 text-xs text-scholar-subtle uppercase tracking-wider">
          {mdPreview ? '预览' : language}
        </span>
        {mdPreview && language === 'markdown' && (
          <button
            onClick={() => setMdPreview(false)}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-cyber-800 hover:bg-cyber-700 text-scholar-text transition-colors"
          >
            恢复编辑
          </button>
        )}
      </div>
      <div className="h-[calc(100%-2rem)] overflow-auto bg-transparent">
        {mdPreview && language === 'markdown' ? (
          <div 
            className="min-h-full p-8 cursor-default"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMdPreview(false);
            }}
          >
            <article className="prose prose-invert max-w-none
              prose-headings:text-scholar-text
              prose-headings:font-semibold
              prose-h1:text-3xl prose-h1:border-b prose-h1:border-cyber-700 prose-h1:pb-3
              prose-h2:text-2xl prose-h2:border-b prose-h2:border-cyber-700/50 prose-h2:pb-2
              prose-h3:text-xl
              prose-h4:text-lg
              prose-p:text-scholar-text prose-p:leading-relaxed
              prose-a:text-teal-400 prose-a:no-underline hover:prose-a:underline
              prose-code:text-purple-400 prose-code:bg-cyber-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-cyber-950 prose-pre:rounded-lg prose-pre:border prose-pre:border-cyber-700 prose-pre:p-4 prose-pre:shadow-lg
              prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0 prose-pre:prose-code:text-scholar-text
              prose-blockquote:border-l-4 prose-blockquote:border-teal-500 prose-blockquote:bg-cyber-800/30 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:text-scholar-muted prose-blockquote:not-italic
              prose-strong:text-amber-400 prose-strong:font-semibold
              prose-ul:text-scholar-text prose-ul:list-disc
              prose-ol:text-scholar-text prose-ol:list-decimal
              prose-li:text-scholar-text prose-li:marker:text-purple-400
              prose-th:text-scholar-text prose-th:bg-cyber-800 prose-th:font-semibold
              prose-td:text-scholar-muted
              prose-th:border-cyber-700 prose-td:border-cyber-700
              prose-table:border-cyber-700 prose-table:rounded-lg prose-table:overflow-hidden
              prose-hr:border-cyber-700
              prose-img:rounded-lg prose-img:shadow-lg
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentContent}
              </ReactMarkdown>
            </article>
            <div className="mt-8 pt-4 border-t border-cyber-700 text-center">
              <p className="text-xs text-scholar-subtle mb-2">右键点击预览区域返回编辑模式</p>
            </div>
          </div>
        ) : (
          <Editor
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
        )}
      </div>
    </div>
  );
}
