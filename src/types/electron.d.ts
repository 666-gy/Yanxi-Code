interface ElectronAPI {
  openFolder: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<FileNode[]>;
  readFile: (filePath: string) => Promise<string | null>;
  saveFile: (filePath: string, content: string) => Promise<boolean>;
  createFile: (dirPath: string, fileName: string, content?: string) => Promise<string | null>;
  deleteFile: (filePath: string) => Promise<boolean>;
  watchWorkspace: (dirPath: string) => Promise<boolean>;
  unwatchWorkspace: () => Promise<boolean>;
  closeWorkspace: () => Promise<boolean>;
  setDirty: (dirty: boolean) => void;
  
  toggleCanvasWindow: () => Promise<boolean>;
  sendToCanvas: (data: unknown) => Promise<boolean>;
  openFileDialog: () => Promise<string | null>;
  selectBackgroundImage: () => Promise<string | null>;
  
  onMenuAction: (callback: (action: string) => void) => () => void;
  onWorkspaceChanged: (callback: (data: { type: string; filename: string; timestamp: number }) => void) => () => void;
  onFromMainWindow: (callback: (data: unknown) => void) => () => void;

  terminal: {
    start: (options: { cwd?: string; cols?: number; rows?: number }) => Promise<{ terminalId: string; shell: string }>;
    write: (terminalId: string, data: string) => void;
    resize: (terminalId: string, cols: number, rows: number) => void;
    dispose: (terminalId: string) => Promise<boolean>;
    prepareRun: (filePath: string) => Promise<RunPlan>;
    executeRun: (planId: string, terminalId: string) => Promise<boolean>;
    onData: (callback: (payload: { terminalId: string; data: string }) => void) => () => void;
    onExit: (callback: (payload: { terminalId: string; exitCode: number; signal?: number }) => void) => () => void;
  };

  secrets: {
    saveApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
    loadApiKey: () => Promise<{ success: boolean; apiKey: string }>;
  };

  checkUpdate: () => Promise<UpdateResult>;

  openExternal: (url: string) => Promise<boolean>;
}

interface RunPlan {
  id?: string;
  supported: boolean;
  label: string;
  commandPreview?: string;
  cwd?: string;
  explanation: string;
  missingTools: string[];
}

interface UpdateResult {
  success: boolean;
  hasUpdate?: boolean;
  currentVersion?: string;
  latestVersion?: string;
  downloadUrl?: string;
  notes?: string;
  error?: string;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  content?: string;
  language?: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
