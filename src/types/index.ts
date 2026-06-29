export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  content?: string;
  language?: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  apiBase: string;
  debounceMs: number;
  autoTranslate: boolean;
  theme: 'dark' | 'light';
}

export type TranslationMode = 'auto' | 'deep';

export type AIStatus = 'idle' | 'thinking' | 'streaming' | 'error' | 'offline';

export interface CodeBlock {
  content: string;
  startLine: number;
  endLine: number;
  language: string;
}
