interface ElectronAPI {
  openFolder: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<FileNode[]>;
  readFile: (filePath: string) => Promise<string | null>;
  saveFile: (filePath: string, content: string) => Promise<boolean>;
  createFile: (dirPath: string, fileName: string, content?: string) => Promise<string | null>;
  deleteFile: (filePath: string) => Promise<boolean>;
  watchWorkspace: (dirPath: string) => Promise<boolean>;
  unwatchWorkspace: () => Promise<boolean>;
  
  toggleAgentWindow: () => Promise<boolean>;
  sendToAgent: (data: any) => Promise<boolean>;
  sendToMain: (data: any) => Promise<boolean>;
  toggleCanvasWindow: () => Promise<boolean>;
  sendToCanvas: (data: any) => Promise<boolean>;
  openFileDialog: () => Promise<string | null>;
  
  onMenuAction: (callback: (event: any, action: string) => void) => void;
  onWorkspaceChanged: (callback: (event: any, data: { type: string; filename: string; timestamp: number }) => void) => void;
  onFromMainWindow: (callback: (event: any, data: any) => void) => void;
  onFromAgent: (callback: (event: any, data: any) => void) => void;

  checkUpdate: () => Promise<UpdateResult>;
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