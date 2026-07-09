const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const {
  isInside,
  buildRunPlan,
  startTerminal,
  writeTerminal,
  resizeTerminal,
  disposeTerminal,
  disposeSender,
  disposeAll,
  executeRun,
} = require('./terminal.cjs');

// 设置AppUserModelId，确保Windows任务栏图标正确显示（仅 Windows）
if (process.platform === 'win32') {
  app.setAppUserModelId('com.yanxi.code');
}

let mainWindow;
let canvasWindow = null;
let agentWindow = null;
let currentWatcher = null;
let watchTimer = null;
let tray = null;
let workspaceRoot = null;
let hasUnsavedChanges = false;
let isQuitting = false;
const allowedFiles = new Set();

function validateSender(event) {
  const sender = event.sender;
  return (
    (mainWindow && !mainWindow.isDestroyed() && sender === mainWindow.webContents) ||
    (canvasWindow && !canvasWindow.isDestroyed() && sender === canvasWindow.webContents) ||
    (agentWindow && !agentWindow.isDestroyed() && sender === agentWindow.webContents)
  );
}

function requireSender(event) {
  if (!validateSender(event)) throw new Error('不受信任的 IPC 来源');
}

function requireWorkspacePath(candidate) {
  if (!workspaceRoot || !isInside(workspaceRoot, candidate)) {
    throw new Error('路径不在当前工作区内');
  }
  const resolved = path.resolve(candidate);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function canReadFile(candidate) {
  const resolved = path.resolve(candidate);
  return (workspaceRoot && isInside(workspaceRoot, resolved)) || allowedFiles.has(resolved);
}

function workspaceStatePath() {
  return path.join(app.getPath('userData'), 'workspace.json');
}

async function persistWorkspaceRoot() {
  if (!workspaceRoot) {
    await fs.promises.rm(workspaceStatePath(), { force: true });
    return;
  }
  await fs.promises.writeFile(workspaceStatePath(), JSON.stringify({ path: workspaceRoot }), 'utf8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Yanxi Code',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#14141b',
    frame: true,
  });
  const mainWebContents = mainWindow.webContents;
  const mainWebContentsId = mainWebContents.id;
  mainWebContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWebContents.on('will-navigate', (event, url) => {
    const isDev = process.argv.includes('--dev');
    const allowed = url.startsWith('file:') || (isDev && url.startsWith('http://localhost:5173'));
    if (!allowed) event.preventDefault();
  });

  // 加载 Vite 构建后的文件
  const isDev = process.argv.includes('--dev');
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 注释掉自动打开DevTools - 不要自动打开控制台
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    disposeSender(mainWebContentsId);
    mainWindow = null;
  });

  mainWindow.on('close', (e) => {
    // 有托盘时隐藏到托盘，无托盘时直接退出
    if (tray && !isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// 打开外部链接（默认浏览器）
ipcMain.handle('open-external', async (event, url) => {
  requireSender(event);
  try {
    const parsed = new URL(url);
    const allowedHosts = new Set(['666-gy.github.io', 'github.com', 'pan.baidu.com']);
    if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) return false;
    await shell.openExternal(parsed.toString());
    return true;
  } catch {
    return false;
  }
});

// 文件操作 IPC
ipcMain.handle('open-folder', async (event) => {
  requireSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  workspaceRoot = fs.realpathSync.native(result.filePaths[0]);
  allowedFiles.clear();
  await persistWorkspaceRoot();
  return workspaceRoot;
});

async function readDirectory(dirPath) {
  try {
    const safeDir = requireWorkspacePath(dirPath);
    const entries = await fs.promises.readdir(safeDir, { withFileTypes: true });
    const items = entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(safeDir, e.name),
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    return items;
  } catch {
    return [];
  }
}

ipcMain.handle('read-directory', async (event, dirPath) => {
  requireSender(event);
  return readDirectory(dirPath);
});

ipcMain.handle('read-file', async (event, filePath) => {
  requireSender(event);
  try {
    if (!canReadFile(filePath)) throw new Error('未授权读取该文件');
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  requireSender(event);
  try {
    const safePath = requireWorkspacePath(filePath);
    await fs.promises.writeFile(safePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('create-file', async (event, { dirPath, fileName, content = '' }) => {
  requireSender(event);
  try {
    const safeDir = requireWorkspacePath(dirPath);
    if (!fileName || path.basename(fileName) !== fileName || /[<>:"|?*\0]/.test(fileName)) return null;
    const filePath = path.join(safeDir, fileName);
    await fs.promises.writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' });
    return filePath;
  } catch {
    return null;
  }
});

// 文件系统监听
ipcMain.handle('watch-workspace', async (event, dirPath) => {
  requireSender(event);
  // 关闭之前的监听
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
  }

  if (!dirPath) return false;

  try {
    const safeDir = requireWorkspacePath(dirPath);
    currentWatcher = fs.watch(safeDir, { recursive: true }, (eventType, filename) => {
      // 防抖：200ms 内多次事件合并
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('workspace-changed', {
            type: eventType,
            filename,
            timestamp: Date.now(),
          });
        }
      }, 200);
    });
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('unwatch-workspace', async () => {
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
  }
  return true;
});

ipcMain.handle('close-workspace', async (event) => {
  requireSender(event);
  if (currentWatcher) currentWatcher.close();
  currentWatcher = null;
  workspaceRoot = null;
  allowedFiles.clear();
  await persistWorkspaceRoot();
  disposeSender(event.sender.id);
  return true;
});

ipcMain.handle('delete-file', async (event, filePath) => {
  requireSender(event);
  try {
    await fs.promises.unlink(requireWorkspacePath(filePath));
    return true;
  } catch {
    return false;
  }
});

// 菜单
const menuTemplate = [
  {
    label: '文件',
    submenu: [
      { label: '打开文件夹...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open-folder') },
      { label: '新建文件', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-file') },
      { type: 'separator' },
      { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
      { type: 'separator' },
      { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
    ],
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  },
  {
    label: '视图',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { role: 'resetZoom' },
    ],
  },
  {
    label: '帮助',
    submenu: [
      { label: '关于 Yanxi', click: () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '关于 Yanxi Code',
          message: 'Yanxi Code - 边写边译 IDE',
          detail: '一款面向初级开发者的学习型 IDE\n写代码，AI 实时翻译解释\n版本: 1.2.9',
        });
      }},
    ],
  },
];

// 单实例锁 - 只允许一个进程运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当第二个实例启动时，显示已有窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  try {
    const saved = JSON.parse(fs.readFileSync(workspaceStatePath(), 'utf8'));
    if (saved.path && fs.existsSync(saved.path)) workspaceRoot = fs.realpathSync.native(saved.path);
  } catch {}
  Menu.setApplicationMenu(null);
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
  }
  if (process.platform !== 'darwin') {
    app.hide();
  }
});

app.on('before-quit', (event) => {
  if (hasUnsavedChanges) {
    const options = {
      type: 'warning',
      buttons: ['取消', '放弃修改并退出'],
      defaultId: 0,
      cancelId: 0,
      title: '存在未保存的文件',
      message: '仍有文件尚未保存，确定退出 Yanxi Code 吗？',
    };
    const choice = mainWindow
      ? dialog.showMessageBoxSync(mainWindow, options)
      : dialog.showMessageBoxSync(options);
    if (choice === 0) {
      event.preventDefault();
      return;
    }
    hasUnsavedChanges = false;
  }
  isQuitting = true;
  disposeAll();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

function createTray() {
  try {
    const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
    
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit();
        }
      },
    ]);
    
    tray.setToolTip('Yanxi Code');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });
  } catch {
    // Tray 创建失败（部分 Linux DE 不支持），应用仍可正常运行
    tray = null;
  }
}

// 打开文件选择对话框
ipcMain.handle('open-file-dialog', async (event) => {
  requireSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || mainWindow, {
    title: '选择要分析的代码文件',
    defaultPath: app.getPath('desktop'),
    filters: [
      { name: '代码文件', extensions: ['py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'html', 'css', 'md', 'txt', 'json', 'go', 'rs', 'swift', 'kt', 'rb'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selected = fs.realpathSync.native(result.filePaths[0]);
  allowedFiles.add(selected);
  return selected;
});

// 选择背景图片并返回 base64
ipcMain.handle('select-background-image', async (event) => {
  requireSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || mainWindow, {
    title: '选择背景图片',
    defaultPath: app.getPath('pictures'),
    filters: [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    const imagePath = result.filePaths[0];
    const ext = path.extname(imagePath).slice(1).toLowerCase();
    const mimeTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };
    const mimeType = mimeTypeMap[ext] || 'image/png';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
});

// 画布窗口
function createCanvasWindow() {
  if (canvasWindow && !canvasWindow.isDestroyed()) {
    canvasWindow.focus();
    return;
  }

  const mainBounds = mainWindow.getBounds();
  
  const width = Math.round(mainBounds.width * 0.85);
  const height = Math.round(mainBounds.height * 0.85);
  const x = mainBounds.x + Math.round((mainBounds.width - width) / 2);
  const y = mainBounds.y + Math.round((mainBounds.height - height) / 2);
  
  canvasWindow = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    minWidth: 700,
    minHeight: 500,
    title: 'Yanxi Canvas',
    frame: true,
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#14141b',
  });
  canvasWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const isDev = process.argv.includes('--dev');
  
  if (isDev) {
    canvasWindow.loadURL('http://localhost:5173/#/canvas');
  } else {
    canvasWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      hash: '/canvas',
    });
  }

  canvasWindow.on('closed', () => {
    canvasWindow = null;
  });
}

ipcMain.handle('toggle-canvas-window', async (event) => {
  requireSender(event);
  if (canvasWindow && !canvasWindow.isDestroyed()) {
    if (canvasWindow.isVisible()) {
      canvasWindow.hide();
      return false;
    } else {
      canvasWindow.show();
      canvasWindow.focus();
      return true;
    }
  } else {
    createCanvasWindow();
    return true;
  }
});

// 画布 -> 主窗口通信（翻译选中文本）
ipcMain.handle('send-selection-to-canvas', async (event, data) => {
  if (canvasWindow && !canvasWindow.isDestroyed()) {
    canvasWindow.webContents.send('from-main-window', data);
    return true;
  }
  return false;
});

// 主窗口 -> 画布窗口通信
ipcMain.handle('send-to-canvas', async (event, data) => {
  requireSender(event);
  if (canvasWindow && !canvasWindow.isDestroyed()) {
    canvasWindow.webContents.send('from-main-window', data);
    return true;
  }
  return false;
});

// ═══════════════════════════════════════
// Agent 窗口
// ═══════════════════════════════════════

function createAgentWindow() {
  if (agentWindow && !agentWindow.isDestroyed()) {
    agentWindow.focus();
    return;
  }

  const mainBounds = mainWindow.getBounds();
  const width = Math.round(mainBounds.width * 0.9);
  const height = Math.round(mainBounds.height * 0.85);
  const x = mainBounds.x + Math.round((mainBounds.width - width) / 2);
  const y = mainBounds.y + Math.round((mainBounds.height - height) / 2);

  agentWindow = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    minWidth: 800,
    minHeight: 550,
    title: 'Yanxi Agent',
    frame: true,
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#14141b',
  });
  agentWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const isDev = process.argv.includes('--dev');

  if (isDev) {
    agentWindow.loadURL('http://localhost:5173/#/agent');
  } else {
    agentWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      hash: '/agent',
    });
  }

  agentWindow.on('closed', () => {
    agentWindow = null;
  });
}

ipcMain.handle('toggle-agent-window', async (event) => {
  requireSender(event);
  if (agentWindow && !agentWindow.isDestroyed()) {
    if (agentWindow.isVisible()) {
      agentWindow.hide();
      return false;
    } else {
      agentWindow.show();
      agentWindow.focus();
      return true;
    }
  } else {
    createAgentWindow();
    return true;
  }
});

ipcMain.handle('agent:get-workspace', async () => ({
  workspaceRoot: workspaceRoot || null,
  workspaceName: workspaceRoot ? path.basename(workspaceRoot) : '',
}));

ipcMain.handle('agent:select-workspace', async (event) => {
  requireSender(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || mainWindow, {
    title: '选择工作区文件夹',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selectedRoot = fs.realpathSync.native(result.filePaths[0]);
  return { path: selectedRoot, name: path.basename(selectedRoot) };
});

ipcMain.handle('agent:search-code', async (event, { dirPath, pattern }) => {
  requireSender(event);
  const results = [];
  if (!dirPath || !pattern) return results;
  try {
    const safeDir = requireWorkspacePath(dirPath);
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        try {
          const text = fs.readFileSync(full, 'utf-8');
          const lines = text.split('\n');
          const re = new RegExp(pattern, 'gi');
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              results.push({
                file: path.relative(safeDir, full),
                line: i + 1,
                content: lines[i].trim().slice(0, 200),
              });
              if (results.length >= 50) return;
            }
          }
        } catch {}
      }
    };
    walk(safeDir);
  } catch {}
  return results;
});

ipcMain.handle('agent:read-file', async (event, { filePath, startLine, endLine }) => {
  requireSender(event);
  try {
    const safePath = requireWorkspacePath(filePath);
    const text = await fs.promises.readFile(safePath, 'utf-8');
    if (startLine && endLine) {
      const lines = text.split('\n');
      return lines.slice(startLine - 1, endLine).join('\n');
    }
    return text;
  } catch {
    return null;
  }
});

ipcMain.handle('agent:write-file', async (event, { filePath, content }) => {
  requireSender(event);
  try {
    const safePath = requireWorkspacePath(filePath);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await fs.promises.writeFile(safePath, content, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('agent:delete-file', async (event, filePath) => {
  requireSender(event);
  try {
    await fs.promises.unlink(requireWorkspacePath(filePath));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('agent:list-directory', async (event, { dirPath }) => {
  requireSender(event);
  try {
    const safeDir = requireWorkspacePath(dirPath);
    const result = [];
    const entries = fs.readdirSync(safeDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      result.push({
        name: e.name,
        isDirectory: e.isDirectory(),
      });
    }
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return result;
  } catch {
    return [];
  }
});

// 集成终端与一键运行
ipcMain.handle('terminal:start', async (event, options = {}) => {
  requireSender(event);
  if (!workspaceRoot) throw new Error('请先打开工作区');
  return startTerminal({ ...options, sender: event.sender, workspaceRoot });
});

ipcMain.on('terminal:write', (event, { terminalId, data }) => {
  requireSender(event);
  writeTerminal(terminalId, data, event.sender.id);
});

ipcMain.on('terminal:resize', (event, { terminalId, cols, rows }) => {
  requireSender(event);
  resizeTerminal(terminalId, cols, rows, event.sender.id);
});

ipcMain.handle('terminal:dispose', async (event, terminalId) => {
  requireSender(event);
  return disposeTerminal(terminalId, event.sender.id);
});

ipcMain.handle('terminal:prepare-run', async (event, filePath) => {
  requireSender(event);
  if (!workspaceRoot) throw new Error('请先打开工作区');
  return buildRunPlan(requireWorkspacePath(filePath), workspaceRoot);
});

ipcMain.handle('terminal:execute-run', async (event, { planId, terminalId }) => {
  requireSender(event);
  return executeRun(planId, terminalId, event.sender.id);
});

ipcMain.on('app:set-dirty', (event, dirty) => {
  requireSender(event);
  hasUnsavedChanges = Boolean(dirty);
});

// API Key 静态加密存储。Linux 无可用安全后端时拒绝持久化。
function apiKeyPath() {
  return path.join(app.getPath('userData'), 'api-key.bin');
}

function secureStorageAvailable() {
  if (!safeStorage.isEncryptionAvailable()) return false;
  if (process.platform === 'linux' && typeof safeStorage.getSelectedStorageBackend === 'function') {
    return safeStorage.getSelectedStorageBackend() !== 'basic_text';
  }
  return true;
}

ipcMain.handle('secrets:save-api-key', async (event, apiKey) => {
  requireSender(event);
  if (!secureStorageAvailable()) {
    return { success: false, error: '系统安全存储不可用，API Key 不会持久化' };
  }
  const value = String(apiKey || '');
  if (!value) {
    await fs.promises.rm(apiKeyPath(), { force: true });
    return { success: true };
  }
  await fs.promises.writeFile(apiKeyPath(), safeStorage.encryptString(value));
  return { success: true };
});

ipcMain.handle('secrets:load-api-key', async (event) => {
  requireSender(event);
  try {
    if (!secureStorageAvailable()) return { success: false, apiKey: '' };
    const encrypted = await fs.promises.readFile(apiKeyPath());
    return { success: true, apiKey: safeStorage.decryptString(encrypted) };
  } catch {
    return { success: true, apiKey: '' };
  }
});


// ═══════════════════════════════════════
// 检查更新
// ═══════════════════════════════════════
const UPDATE_CHECK_URL = 'https://666-gy.github.io/Yanxi-Code/website/version.json';
const UPDATE_UA = `YanxiCode/${app.getVersion()} (${process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux'}; ${process.arch})`;

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

ipcMain.handle('check-update', async (event) => {
  requireSender(event);
  return new Promise((resolve) => {
    const req = https.get(UPDATE_CHECK_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': UPDATE_UA,
        'Accept': 'application/json',
      }
    }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location;
        https.get(redirectUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': UPDATE_UA,
            'Accept': 'application/json',
          }
        }, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            try {
              const clean = data.replace(/^\uFEFF/, '').trim();
              const remote = JSON.parse(clean);
              const current = app.getVersion();
              const hasUpdate = compareVersions(remote.version, current) > 0;
              resolve({
                success: true, hasUpdate,
                currentVersion: current,
                latestVersion: remote.version,
                downloadUrl: remote.url || 'https://666-gy.github.io/Yanxi-Code/website/index.html#download',
                notes: remote.notes || '',
              });
            } catch (e) {
              resolve({ success: false, error: '版本信息解析失败' });
            }
          });
        }).on('error', () => resolve({ success: false, error: '网络连接失败，请检查网络或使用代理' }));
        return;
      }

      if (res.statusCode !== 200) {
        resolve({ success: false, error: `服务器返回 ${res.statusCode}` });
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // 去掉 BOM 头
          const clean = data.replace(/^\uFEFF/, '').trim();
          const remote = JSON.parse(clean);
          const current = app.getVersion();
          const hasUpdate = compareVersions(remote.version, current) > 0;
          resolve({
            success: true, hasUpdate,
            currentVersion: current,
            latestVersion: remote.version,
            downloadUrl: remote.url || 'https://yanxicode.jhhcn.icu/download',
            notes: remote.notes || '',
          });
        } catch (e) {
          console.error('[check-update] JSON parse failed, raw:', data.substring(0, 200));
          resolve({ success: false, error: `版本信息解析失败 (${e.message})` });
        }
      });
    });
    req.on('error', (e) => {
      console.error('[check-update] request error:', e.message);
      resolve({ success: false, error: '网络连接失败，请检查网络或使用代理' });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: '连接超时，请检查网络' });
    });
  });
});
