import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode, CursorPosition, AppSettings, TranslationMode, AIStatus } from '../types';

interface OpenTab {
  path: string;
  name: string;
  language: string;
  modified: boolean;
}

interface AppState {
  // 工作区
  workspacePath: string | null;
  workspaceName: string;
  files: FileNode[];
  
  // 多 tab
  openTabs: OpenTab[];
  activeFilePath: string | null;
  fileContents: Record<string, string>;
  
  // 编辑器
  cursorPosition: CursorPosition;
  selectedCode: string | null;
  
  // 翻译
  translation: string;
  isTranslating: boolean;
  translationMode: TranslationMode;
  aiStatus: AIStatus;
  translateEnabled: boolean; // 用户控制的翻译开关
  
  // 设置
  settings: AppSettings;
  
  // UI 状态
  sidebarOpen: boolean;
  translatePanelOpen: boolean;
  settingsOpen: boolean;
  newFileDialogOpen: boolean;
  
  // Actions - 工作区
  setWorkspacePath: (path: string | null) => void;
  setWorkspaceName: (name: string) => void;
  setFiles: (files: FileNode[]) => void;
  openFolder: (path: string, name: string) => void;
  
  // Actions - Tab
  openFile: (path: string, name: string, language: string, content?: string) => void;
  closeTab: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  markModified: (path: string, modified: boolean) => void;
  setFileContent: (path: string, content: string) => void;
  
  // Actions - 其他
  setCursorPosition: (pos: CursorPosition) => void;
  setSelectedCode: (code: string | null) => void;
  setTranslation: (text: string) => void;
  appendTranslation: (text: string) => void;
  setIsTranslating: (val: boolean) => void;
  setTranslationMode: (mode: TranslationMode) => void;
  setAIStatus: (status: AIStatus) => void;
  setTranslateEnabled: (enabled: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
  toggleTranslatePanel: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openNewFileDialog: () => void;
  closeNewFileDialog: () => void;
  
  // 新文件
  createNewFile: (name: string) => void;
}

const defaultSettings: AppSettings = {
  apiKey: '',
  model: 'deepseek-chat',
  apiBase: 'https://api.deepseek.com',
  debounceMs: 500,
  autoTranslate: true,
  theme: 'dark',
};

// 手动从 localStorage 加载 API Key（最稳妥）
const savedApiKey = localStorage.getItem('decipher-api-key');
if (savedApiKey) {
  defaultSettings.apiKey = savedApiKey;
}
const savedApiBase = localStorage.getItem('decipher-api-base');
if (savedApiBase) {
  defaultSettings.apiBase = savedApiBase;
}
const savedModel = localStorage.getItem('decipher-model');
if (savedModel) {
  defaultSettings.model = savedModel;
}
const savedTheme = localStorage.getItem('decipher-theme');
if (savedTheme) {
  defaultSettings.theme = savedTheme as 'dark' | 'light';
}

// 空工作区初始状态
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      workspacePath: null,
      workspaceName: '未打开工作区',
      files: [],
      
      openTabs: [],
      activeFilePath: null,
      fileContents: {},
      
      cursorPosition: { line: 1, column: 1 },
      selectedCode: null,
      
      translation: '',
      isTranslating: false,
      translationMode: 'auto',
      aiStatus: 'idle',
      translateEnabled: true, // 默认开启
      
      settings: defaultSettings,
      
      sidebarOpen: true,
      translatePanelOpen: true,
      settingsOpen: false,
      newFileDialogOpen: false,
      
      // Actions - 工作区
      setWorkspacePath: (path) => set({ workspacePath: path }),
      setWorkspaceName: (name) => set({ workspaceName: name }),
      setFiles: (files) => set({ files }),
      
      openFolder: (path, name) => {
        set({
          workspacePath: path,
          workspaceName: name,
          openTabs: [],
          activeFilePath: null,
          fileContents: {},
        });
      },
      
      // Actions - Tab
      openFile: (path, name, language, content) => {
        const state = get();
        const existingTab = state.openTabs.find(t => t.path === path);
        
        if (existingTab) {
          set({ activeFilePath: path });
          return;
        }
        
        const newTab: OpenTab = {
          path,
          name,
          language,
          modified: false,
        };
        
        set({
          openTabs: [...state.openTabs, newTab],
          activeFilePath: path,
          fileContents: content
            ? { ...state.fileContents, [path]: content }
            : state.fileContents,
        });
      },
      
      closeTab: (path) => {
        const state = get();
        const newTabs = state.openTabs.filter(t => t.path !== path);
        let newActive = state.activeFilePath;
        
        if (state.activeFilePath === path) {
          // 关闭当前 tab，切换到相邻的
          const idx = state.openTabs.findIndex(t => t.path === path);
          if (newTabs.length > 0) {
            newActive = newTabs[Math.min(idx, newTabs.length - 1)].path;
          } else {
            newActive = null;
          }
        }
        
        set({
          openTabs: newTabs,
          activeFilePath: newActive,
        });
      },
      
      setActiveFile: (path) => set({ activeFilePath: path }),
      
      markModified: (path, modified) => {
        set((state) => ({
          openTabs: state.openTabs.map(t =>
            t.path === path ? { ...t, modified } : t
          ),
        }));
      },
      
      setFileContent: (path, content) => {
        set((state) => ({
          fileContents: { ...state.fileContents, [path]: content },
        }));
        get().markModified(path, true);
      },
      
      // Actions - 其他
      setCursorPosition: (pos) => set({ cursorPosition: pos }),
      setSelectedCode: (code) => set({ selectedCode: code }),
      setTranslation: (text) => set({ translation: text }),
      appendTranslation: (text) =>
        set((state) => ({ translation: state.translation + text })),
      setIsTranslating: (val) => set({ isTranslating: val }),
      setTranslationMode: (mode) => set({ translationMode: mode }),
      setAIStatus: (status) => set({ aiStatus: status }),
      setTranslateEnabled: (enabled) => set({ translateEnabled: enabled }),
      updateSettings: (partial) => {
        const newSettings = { ...get().settings, ...partial };
        set({ settings: newSettings });
        // 手动保存到 localStorage（双保险）
        if (partial.apiKey !== undefined) {
          localStorage.setItem('decipher-api-key', partial.apiKey);
        }
        if (partial.apiBase !== undefined) {
          localStorage.setItem('decipher-api-base', partial.apiBase);
        }
        if (partial.model !== undefined) {
          localStorage.setItem('decipher-model', partial.model);
        }
        if (partial.theme !== undefined) {
          localStorage.setItem('decipher-theme', partial.theme);
        }
      },
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleTranslatePanel: () =>
        set((state) => ({ translatePanelOpen: !state.translatePanelOpen })),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openNewFileDialog: () => set({ newFileDialogOpen: true }),
      closeNewFileDialog: () => set({ newFileDialogOpen: false }),
      
      createNewFile: async (name) => {
        const state = get();
        if (!state.workspacePath) return;
        
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          py: 'python',
          js: 'javascript',
          ts: 'typescript',
          html: 'html',
          css: 'css',
          java: 'java',
          cpp: 'cpp',
          c: 'c',
          md: 'markdown',
          txt: 'plaintext',
        };
        const language = langMap[ext] || 'plaintext';
        
        // 通过 Electron API 创建文件
        let newPath = state.workspacePath + '/' + name;
        if (window.electronAPI) {
          const createdPath = await window.electronAPI.createFile(state.workspacePath, name, '');
          if (createdPath) {
            newPath = createdPath;
          }
        }
        
        const content = '';
        
        const newTab: OpenTab = {
          path: newPath,
          name,
          language,
          modified: false,
        };
        
        set({
          openTabs: [...state.openTabs, newTab],
          activeFilePath: newPath,
          fileContents: { ...state.fileContents, [newPath]: content },
        });
      },
    }),
    {
      name: 'decipher-storage',
      partialize: (state) => ({
        settings: state.settings,
        translateEnabled: state.translateEnabled,
        workspacePath: state.workspacePath,
      }),
    }
  )
);