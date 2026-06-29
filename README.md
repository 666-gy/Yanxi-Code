<div align="center">

# Yanxi Code

**所想即所写，所写即所现。**

一款面向初级开发者的学习型 IDE —— 写代码，AI 实时翻译解释。

</div>

## ✨ 特性

- **边写边译**：代码实时翻译解释，帮助快速理解编程概念
- **多语言支持**：Python、JavaScript、TypeScript、Java、C/C++、HTML、CSS 等
- **AI 驱动**：基于 DeepSeek API，精准解读代码逻辑
- **Agent 助手**：内置 AI Agent，支持读写/增删改查文件操作
- **画布模式**：右键代码查看画布解释，可视化理解代码结构
- **工作区管理**：完整的文件树、多标签页、快捷键支持
- **实时同步**：文件系统监听，工作区变化实时更新
- **主题切换**：深浅色主题自由切换
- **系统托盘**：后台保活，随时唤出

## 🛠️ 技术栈

- **框架**：Electron + React 18 + TypeScript
- **构建**：Vite
- **样式**：Tailwind CSS
- **状态管理**：Zustand
- **编辑器**：Monaco Editor (VS Code 同款)
- **AI**：DeepSeek API
- **打包**：electron-builder

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器 + Electron
npm run dev
```

### 打包构建

```bash
# 构建前端 + 打包 Electron
npm run electron:build

# 产物位于 release/ 目录
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 新建文件 |
| `Ctrl + O` | 打开文件夹 |
| `Ctrl + S` | 保存文件 |
| `Ctrl + Shift + A` | 打开 Agent |
| `Ctrl + B` | 切换侧边栏 |

## 📁 项目结构

```
├── electron/          # Electron 主进程
│   ├── main.cjs       # 主入口
│   └── preload.cjs    # 预加载脚本
├── src/               # 渲染进程
│   ├── components/    # UI 组件
│   ├── pages/         # 页面
│   ├── hooks/         # 自定义 Hooks
│   ├── store/         # 状态管理
│   ├── utils/         # 工具函数
│   └── App.tsx        # 根组件
├── public/            # 静态资源
├── build/             # 打包资源 (图标等)
└── package.json       # 项目配置
```

## 📝 License

MIT
