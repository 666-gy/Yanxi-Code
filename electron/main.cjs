const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// 设置AppUserModelId，确保Windows任务栏图标正确显示（仅 Windows）
if (process.platform === 'win32') {
  app.setAppUserModelId('com.yanxi.code');
}

let mainWindow;
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
    backgroundColor: '#14141b',
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
    // 有托盘时隐藏到托盘，无托盘时直接退出
    if (tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// 打开外部链接（默认浏览器）
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch {
    return false;
  }
});

// 文件操作 IPC
ipcMain.handle('open-folder', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || mainWindow, {
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
  } catch {
    // Tray 创建失败（部分 Linux DE 不支持），应用仍可正常运行
    tray = null;
  }
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

// 选择背景图片并返回 base64
ipcMain.handle('select-background-image', async (event) => {
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

ipcMain.handle('check-update', async () => {
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