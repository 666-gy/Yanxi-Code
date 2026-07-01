const { app, BrowserWindow, ipcMain, dialog, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// 设置AppUserModelId，确保Windows任务栏图标正确显示
app.setAppUserModelId('com.yanxi.code');

let mainWindow;
let agentWindow = null;
let canvasWindow = null;
let currentWatcher = null;
let watchTimer = null;
let tray = null;

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
    backgroundColor: '#0f172a',
    frame: true,
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
    mainWindow = null;
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

// 文件操作 IPC
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

function readDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(dirPath, e.name),
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    
    for (const item of items) {
      if (item.isDirectory) {
        item.children = readDirectory(item.path);
      } else {
        try {
          const ext = item.name.split('.').pop()?.toLowerCase();
          if (['py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'html', 'css', 'md', 'txt', 'json'].includes(ext)) {
            item.content = fs.readFileSync(item.path, 'utf-8');
          }
        } catch {
          item.content = '';
        }
      }
    }
    
    return items;
  } catch {
    return [];
  }
}

ipcMain.handle('read-directory', async (event, dirPath) => {
  return readDirectory(dirPath);
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('create-file', async (event, { dirPath, fileName, content = '' }) => {
  try {
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  } catch {
    return null;
  }
});

// 文件系统监听
ipcMain.handle('watch-workspace', async (event, dirPath) => {
  // 关闭之前的监听
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
  }

  if (!dirPath) return false;

  try {
    currentWatcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
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

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    fs.unlinkSync(filePath);
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
          detail: '一款面向初级开发者的学习型 IDE\n写代码，AI 实时翻译解释\n版本: 1.2.0',
        });
      }},
    ],
  },
];

app.whenReady().then(() => {
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

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

function createTray() {
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
        app.exit();
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
}

// 打开文件选择对话框
ipcMain.handle('open-file-dialog', async (event) => {
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
  return result.filePaths[0];
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
    backgroundColor: '#0f172a',
  });

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

ipcMain.handle('toggle-canvas-window', async () => {
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
  if (canvasWindow && !canvasWindow.isDestroyed()) {
    canvasWindow.webContents.send('from-main-window', data);
    return true;
  }
  return false;
});

// Agent 窗口
function createAgentWindow() {
  if (agentWindow && !agentWindow.isDestroyed()) {
    agentWindow.focus();
    return;
  }

  const mainBounds = mainWindow.getBounds();
  
  // 窗口尺寸略小于主窗口，保持相似比例
  const width = Math.round(mainBounds.width * 0.85);
  const height = Math.round(mainBounds.height * 0.85);
  const x = mainBounds.x + Math.round((mainBounds.width - width) / 2);
  const y = mainBounds.y + Math.round((mainBounds.height - height) / 2);
  
  agentWindow = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    minWidth: 600,
    minHeight: 500,
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
    backgroundColor: '#0a0f1a',
  });

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

ipcMain.handle('toggle-agent-window', async () => {
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

// 主窗口 -> Agent 窗口通信
ipcMain.handle('send-to-agent', async (event, data) => {
  if (agentWindow && !agentWindow.isDestroyed()) {
    agentWindow.webContents.send('from-main-window', data);
    return true;
  }
  return false;
});

// Agent 窗口 -> 主窗口通信
ipcMain.handle('send-to-main', async (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('from-agent', data);
    return true;
  }
  return false;
});

// ═══════════════════════════════════════
// 检查更新
// ═══════════════════════════════════════
const UPDATE_CHECK_URL = 'https://yanxicode.jhhcn.icu/version.json';

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

ipcMain.handle('check-update', async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(UPDATE_CHECK_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `服务器返回 ${response.status}` };
    }

    const text = await response.text();
    // 去掉可能的 BOM 头
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    const remote = JSON.parse(cleanText);

    const current = app.getVersion();
    const hasUpdate = compareVersions(remote.version, current) > 0;
    return {
      success: true,
      hasUpdate,
      currentVersion: current,
      latestVersion: remote.version,
      downloadUrl: remote.url || 'https://yanxicode.jhhcn.icu/download',
      notes: remote.notes || '',
    };
  } catch (e) {
    return { success: false, error: `检查更新失败: ${e.message}` };
  }
});