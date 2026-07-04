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
  backgroundImage: string | null;
  backgroundOpacity: number;
}

export interface ApiUsage {
  totalTokens: number;
  totalCost: number;
  modelUsages: Record<string, { tokens: number; cost: number }>;
  featureUsages: Record<string, { tokens: number; cost: number }>;
  callCount: number;
}

export type TranslationMode = 'auto' | 'deep';

export type AIStatus = 'idle' | 'thinking' | 'streaming' | 'error' | 'offline';

export interface CodeBlock {
  content: string;
  startLine: number;
  endLine: number;
  language: string;
}
