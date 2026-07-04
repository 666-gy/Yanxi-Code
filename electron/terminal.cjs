const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const pty = require('node-pty');

const sessions = new Map();
const runPlans = new Map();

function isInside(root, candidate) {
  if (!root || !candidate) return false;
  const canonical = (value) => {
    const resolved = path.resolve(value);
    try {
      return fs.realpathSync.native(resolved);
    } catch {
      try {
        return path.join(fs.realpathSync.native(path.dirname(resolved)), path.basename(resolved));
      } catch {
        return resolved;
      }
    }
  };
  const relative = path.relative(canonical(root), canonical(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertInside(root, candidate) {
  if (!isInside(root, candidate)) throw new Error('路径不在当前工作区内');
  return path.resolve(candidate);
}

function findExecutable(names) {
  const delimiter = process.platform === 'win32' ? ';' : ':';
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';')
    : [''];
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    for (const name of names) {
      for (const ext of extensions) {
        const candidate = path.join(dir, process.platform === 'win32' ? `${name}${ext}` : name);
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          return candidate;
        } catch {}
      }
    }
  }
  return null;
}

function shellQuote(value) {
  if (process.platform === 'win32') {
    return `'${String(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function commandLine(executable, args) {
  if (process.platform === 'win32') {
    return `& ${shellQuote(executable)} ${args.map(shellQuote).join(' ')}`.trim();
  }
  return [shellQuote(executable), ...args.map(shellQuote)].join(' ');
}

function chainCommands(first, second) {
  return process.platform === 'win32'
    ? `${first}; if ($LASTEXITCODE -eq 0) { ${second} }`
    : `${first} && ${second}`;
}

function nearestManifest(start, root, names) {
  let current = path.dirname(start);
  while (isInside(root, current)) {
    for (const name of names) {
      const candidate = path.join(current, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    if (current === path.resolve(root)) break;
    current = path.dirname(current);
  }
  return null;
}

function nearestFileWithExtension(start, root, extension) {
  let current = path.dirname(start);
  while (isInside(root, current)) {
    const match = fs.readdirSync(current).find((name) => name.toLowerCase().endsWith(extension));
    if (match) return path.join(current, match);
    if (current === path.resolve(root)) break;
    current = path.dirname(current);
  }
  return null;
}

function missingPlan(label, tool, hint) {
  return { supported: false, label, missingTools: [tool], explanation: hint };
}

function buildRunPlan(filePath, workspaceRoot) {
  const safeFile = assertInside(workspaceRoot, filePath);
  if (!fs.existsSync(safeFile)) throw new Error('文件不存在，请先保存');
  const ext = path.extname(safeFile).toLowerCase();
  const tempDir = path.join(os.tmpdir(), 'yanxi-run', crypto.createHash('sha1').update(safeFile).digest('hex').slice(0, 12));
  fs.mkdirSync(tempDir, { recursive: true });

  let executable;
  let args = [];
  let cwd = workspaceRoot;
  let label = '运行当前文件';
  let explanation = '';

  if (ext === '.py') {
    executable = findExecutable(process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python']);
    if (!executable) return missingPlan('运行 Python', 'Python', '请先安装 Python，并确保命令已加入 PATH。');
    args = process.platform === 'win32' && path.basename(executable).toLowerCase().startsWith('py') ? ['-3', safeFile] : [safeFile];
    label = '运行 Python';
  } else if (ext === '.js' || ext === '.jsx') {
    executable = findExecutable(['node']);
    if (!executable) return missingPlan('运行 JavaScript', 'Node.js', '请先安装 Node.js，并确保 node 已加入 PATH。');
    if (ext === '.jsx') return missingPlan('运行 JSX', 'tsx', 'JSX 需要项目运行器；请安装 tsx 或使用 package.json 中的项目脚本。');
    args = [safeFile];
    label = '运行 JavaScript';
  } else if (ext === '.ts' || ext === '.tsx') {
    const localTsx = path.join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
    executable = fs.existsSync(localTsx) ? localTsx : findExecutable(['tsx']);
    if (!executable) return missingPlan('运行 TypeScript', 'tsx', '请在项目中安装 tsx（npm install -D tsx）后再运行。');
    args = [safeFile];
    label = '运行 TypeScript';
  } else if (ext === '.go') {
    executable = findExecutable(['go']);
    if (!executable) return missingPlan('运行 Go', 'Go', '请先安装 Go，并确保 go 已加入 PATH。');
    args = ['run', safeFile];
    label = '运行 Go';
  } else if (ext === '.rs') {
    const cargo = findExecutable(['cargo']);
    const manifest = nearestManifest(safeFile, workspaceRoot, ['Cargo.toml']);
    if (cargo && manifest) {
      executable = cargo;
      args = ['run', '--manifest-path', manifest];
      cwd = path.dirname(manifest);
    } else {
      executable = findExecutable(['rustc']);
      if (!executable) return missingPlan('运行 Rust', 'Rust', '请先安装 Rust 工具链（rustup）。');
      const output = path.join(tempDir, process.platform === 'win32' ? 'yanxi-run.exe' : 'yanxi-run');
      const compile = commandLine(executable, [safeFile, '-o', output]);
      const run = process.platform === 'win32' ? `& ${shellQuote(output)}` : shellQuote(output);
      return finalizePlan('编译并运行 Rust', chainCommands(compile, run), cwd, '先编译到系统临时目录，再运行生成的程序。');
    }
    label = '运行 Rust 项目';
  } else if (ext === '.c' || ext === '.cpp') {
    executable = findExecutable(ext === '.c' ? ['gcc', 'clang'] : ['g++', 'clang++']);
    if (!executable) return missingPlan(`运行 ${ext === '.c' ? 'C' : 'C++'}`, 'C/C++ 编译器', '请安装 GCC 或 Clang，并加入 PATH。');
    const output = path.join(tempDir, process.platform === 'win32' ? 'yanxi-run.exe' : 'yanxi-run');
    const compile = commandLine(executable, [safeFile, '-o', output]);
    const run = process.platform === 'win32' ? `& ${shellQuote(output)}` : shellQuote(output);
    return finalizePlan(`编译并运行 ${ext === '.c' ? 'C' : 'C++'}`, chainCommands(compile, run), cwd, '先编译到系统临时目录，再运行生成的程序。');
  } else if (ext === '.java') {
    const javac = findExecutable(['javac']);
    const java = findExecutable(['java']);
    if (!javac || !java) return missingPlan('运行 Java', 'JDK', '请安装 JDK，并确保 java 与 javac 已加入 PATH。');
    const source = fs.readFileSync(safeFile, 'utf8');
    const packageName = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    const className = [packageName, path.basename(safeFile, ext)].filter(Boolean).join('.');
    const compile = commandLine(javac, ['-d', tempDir, safeFile]);
    const run = commandLine(java, ['-cp', tempDir, className]);
    return finalizePlan('编译并运行 Java', chainCommands(compile, run), cwd, '类名需与文件名一致；编译结果保存在系统临时目录。');
  } else if (ext === '.cs') {
    const dotnet = findExecutable(['dotnet']);
    const manifest = nearestFileWithExtension(safeFile, workspaceRoot, '.csproj');
    if (!dotnet) return missingPlan('运行 C#', '.NET SDK', '请安装 .NET SDK，并确保 dotnet 已加入 PATH。');
    if (!manifest) return missingPlan('运行 C#', '.csproj', '当前版本通过 .NET 项目运行 C#；请先创建或打开包含 .csproj 的项目。');
    executable = dotnet;
    args = ['run', '--project', manifest];
    cwd = path.dirname(manifest);
    label = '运行 C# 项目';
  } else {
    return { supported: false, label: '无法运行', missingTools: [], explanation: '该文件类型不可直接执行，请在终端中使用对应项目命令。' };
  }

  return finalizePlan(label, commandLine(executable, args), cwd, explanation || `在 ${path.basename(cwd)} 中运行当前文件。`);
}

function finalizePlan(label, command, cwd, explanation) {
  const id = crypto.randomUUID();
  const plan = { id, supported: true, label, commandPreview: command, cwd, explanation, createdAt: Date.now() };
  runPlans.set(id, plan);
  return { id, supported: true, label, commandPreview: command, cwd, explanation, missingTools: [] };
}

function defaultShell() {
  if (process.platform === 'win32') {
    const powershell = findExecutable(['pwsh', 'powershell']);
    return { executable: powershell || process.env.ComSpec || 'cmd.exe', args: [] };
  }
  const candidate = process.env.SHELL;
  return { executable: candidate && path.isAbsolute(candidate) && fs.existsSync(candidate) ? candidate : (findExecutable(['bash', 'sh']) || '/bin/sh'), args: [] };
}

function startTerminal({ cwd, cols = 80, rows = 24, sender, workspaceRoot }) {
  const safeCwd = assertInside(workspaceRoot, cwd || workspaceRoot);
  for (const [id, session] of sessions) {
    if (session.senderId === sender.id) return { terminalId: id, shell: session.shell };
  }
  const shell = defaultShell();
  const child = pty.spawn(shell.executable, shell.args, {
    name: 'xterm-256color',
    cols: Math.max(2, cols),
    rows: Math.max(1, rows),
    cwd: safeCwd,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
  });
  const terminalId = crypto.randomUUID();
  const session = { child, senderId: sender.id, shell: path.basename(shell.executable) };
  sessions.set(terminalId, session);
  child.onData((data) => {
    if (!sender.isDestroyed()) sender.send('terminal:data', { terminalId, data });
  });
  child.onExit(({ exitCode, signal }) => {
    sessions.delete(terminalId);
    if (!sender.isDestroyed()) sender.send('terminal:exit', { terminalId, exitCode, signal });
  });
  return { terminalId, shell: session.shell };
}

function writeTerminal(terminalId, data, senderId) {
  const session = sessions.get(terminalId);
  if (!session || session.senderId !== senderId) return false;
  session.child.write(String(data).slice(0, 64 * 1024));
  return true;
}

function resizeTerminal(terminalId, cols, rows, senderId) {
  const session = sessions.get(terminalId);
  if (!session || session.senderId !== senderId) return false;
  session.child.resize(Math.max(2, cols), Math.max(1, rows));
  return true;
}

function disposeTerminal(terminalId, senderId) {
  const session = sessions.get(terminalId);
  if (!session || (senderId && session.senderId !== senderId)) return false;
  sessions.delete(terminalId);
  session.child.kill();
  return true;
}

function disposeSender(senderId) {
  for (const [id, session] of sessions) {
    if (session.senderId === senderId) disposeTerminal(id);
  }
}

function disposeAll() {
  for (const id of [...sessions.keys()]) disposeTerminal(id);
  runPlans.clear();
  fs.rmSync(path.join(os.tmpdir(), 'yanxi-run'), { recursive: true, force: true });
}

function executeRun(planId, terminalId, senderId) {
  const plan = runPlans.get(planId);
  if (!plan || Date.now() - plan.createdAt > 5 * 60 * 1000) throw new Error('运行计划已过期，请重新确认');
  runPlans.delete(planId);
  return writeTerminal(terminalId, `${plan.commandPreview}${os.EOL}`, senderId);
}

module.exports = {
  isInside,
  buildRunPlan,
  startTerminal,
  writeTerminal,
  resizeTerminal,
  disposeTerminal,
  disposeSender,
  disposeAll,
  executeRun,
};
