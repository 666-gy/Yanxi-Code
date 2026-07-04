<div align="center">

# Yanxi Code

**所想即所写，所写即所现。**

一款面向初级开发者的学习型 IDE —— AI 实时翻译解释代码，边写边学。

[![GitHub release](https://img.shields.io/github/v/release/666-gy/Yanxi-Code?color=amber)](https://github.com/666-gy/Yanxi-Code/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/666-gy/Yanxi-Code/total?color=green)](https://github.com/666-gy/Yanxi-Code/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[官网](https://666-gy.github.io/Yanxi-Code/website/index.html) · [更新日志](#更新日志) · [提交 Issue](https://github.com/666-gy/Yanxi-Code/issues)

</div>

---

## ✨ 核心特性

### 🌏 译行（边写边译）

写代码的同时，AI 逐行将代码翻译成中文解释。换行时自动翻译上一行代码，用一句话说清楚这行代码在干什么 —— 不啰嗦、不分点、不打断你的思路。

- **按行触发**：光标移到下一行时自动翻译上一行，不逐字触发
- **一句话释义**：只说这行代码的作用，不超过两句话
- **流式输出**：翻译结果实时流入右侧面板
- 支持 `auto`（自动释义）和 `explain`（详细讲解）两种模式

### 🎨 自定义背景

设置面板「外观设置」支持上传自定义背景图片，自由调节透明度（0%–100%），打造专属编码空间。

### 🖼️ Yan Board 画布空间

拖拽文件到画布 → AI 自动拆分代码为逻辑模块，可视化展示每个函数/类/逻辑块的作用和调用关系。

- **拖拽分析**：从文件管理器直接拖拽文件到画布
- **模块化展示**：AI 自动将代码拆分为入口、函数、类、IO、校验等模块卡片
- **深入解析**：点击任意模块卡片，AI 逐段讲解代码逻辑、关联概念和常见陷阱
- **跑马灯动画**：分析过程中窗口边框显示流动光效，视觉反馈清晰
- **历史记录**：横栏关闭画布后文件仍保留在侧栏历史中，随时重新打开

### 🧠 代码自动补全

Monaco Editor 驱动（VS Code 同款），三层补全覆盖 8 种语言：

| 层级 | 说明 | 覆盖语言 |
|------|------|---------|
| 关键词补全 | 语言关键字自动弹出 | Python / Java / C / C++ / C# / Go / Rust |
| 代码片段 | 输入缩写自动展开模板 | 7 种语言共 50+ 片段 |
| 文档符号 | 实时扫描当前文件的变量、函数、类名 | 全语言 |
| Monaco 内置 | 智能补全、参数提示 | TypeScript / JavaScript |

本地 Worker 运行，不依赖 CDN，补全响应稳定。

### 💰 API 用量计费

内置累加计费面板，实时统计所有 AI 功能的 token 消耗和费用：
- **全功能计入**：译行、画布分析、Agent 对话 —— 花了就是花了，0.0001 也算
- **重启不归零**：数据持久化到 localStorage
- **状态栏一览**：底部状态栏实时显示累计费用
- **可调单价**：设置面板中可自定义输入/输出 token 单价

### 📝 Markdown 实时预览

打开 `.md` 文件后右键选择「查看预览」，支持完整 Markdown 渲染：
- 标题层级、代码块高亮、表格、引用块、列表
- 深色/浅色主题自适应
- 预览状态下右键即可返回编辑模式

### 🎨 深色主题

护眼深色模式，CSS 变量驱动全站主题适配，沉浸式编码体验。

### 🔄 软件内检查更新

安装版支持一键检查更新，发现新版本右下角弹窗提示，点击直接跳转官网下载。

### 📌 系统托盘常驻

关闭窗口时最小化到系统托盘，后台常驻不退出，点击托盘图标即可恢复窗口。

---

## 📦 安装

### 方式一：百度网盘（推荐）

| 版本 | 下载 |
|------|------|
| 安装版（Setup） | [点击下载](https://pan.baidu.com/s/1Nm6sczDw9JFyJewy-VYL-Q?pwd=code) |
| 便携版（Portable） | [点击下载](https://pan.baidu.com/s/1oS6MKAJQxmGmG1PuDbRFaQ?pwd=code) |

### 方式二：GitHub Releases

前往 [Releases 页面](https://github.com/666-gy/Yanxi-Code/releases) 下载最新版。

### Linux 用户

Linux 版本不提供预编译安装包，请自行克隆仓库构建：

```bash
git clone https://github.com/666-gy/Yanxi-Code.git
cd Yanxi-Code
npm install
npm run electron:build
```

产物位于 `release/` 目录，包含 AppImage 和 deb 两种格式。

### 官方网站

访问 [https://666-gy.github.io/Yanxi-Code/website/index.html](https://666-gy.github.io/Yanxi-Code/website/index.html) 获取最新信息。

---

## 🚀 快速开始

### 环境要求

- Windows 10 / 11（64 位）
- Linux（自行构建，AppImage / deb）
- 自行准备 DeepSeek API Key（[点击获取](https://platform.deepseek.com)）

### 首次使用

1. 安装并启动 Yanxi Code
2. 打开设置（左下角齿轮图标）
3. 填入你的 DeepSeek API Key
4. 选择模型（V4 Flash 或 V4 Pro）
5. 开始写代码，AI 会自动翻译解释！

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 新建文件 |
| `Ctrl + O` | 打开文件夹 |
| `Ctrl + S` | 保存文件 |
| `Ctrl + B` | 切换左侧文件树 |
| `Ctrl + Shift + T` | 打开译行面板 |

---

## 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| 框架 | Electron + React 18 + TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand（持久化） |
| 编辑器 | Monaco Editor（VS Code 同款） |
| AI | DeepSeek API（V4 Flash / V4 Pro） |
| Markdown | react-markdown + remark-gfm |
| 打包 | electron-builder |

---

## 📁 项目结构

```
Yanxi-Code/
├── electron/                  # Electron 主进程
│   ├── main.cjs               # 主入口（窗口管理、IPC、系统托盘、检查更新）
│   └── preload.cjs            # 预加载脚本（暴露 API 到渲染进程）
├── src/
│   ├── components/            # UI 组件
│   │   ├── Editor.tsx         # Monaco 编辑器（补全、译行、Markdown 预览）
│   │   ├── Header.tsx         # 顶部栏（Yan Board 入口、译行开关）
│   │   ├── StatusBar.tsx      # 底部状态栏（API 计费）
│   │   ├── SettingsModal.tsx  # 设置面板
│   │   ├── TranslatePanel.tsx # 译行面板
│   │   ├── FileTree.tsx       # 文件树（实时监听）
│   │   ├── TabBar.tsx         # 多标签页
│   │   └── NewFileDialog.tsx  # 新建文件对话框
│   ├── pages/
│   │   └── CanvasPage.tsx     # Yan Board 画布页
│   ├── hooks/
│   │   ├── useDeepSeek.ts     # DeepSeek API 调用（流式翻译）
│   │   └── useDebounce.ts     # 防抖 Hook
│   ├── store/
│   │   └── useStore.ts        # Zustand 状态管理（持久化）
│   ├── utils/
│   │   └── codeExtractor.ts   # 代码提取工具（单行/选中/全文）
│   ├── theme/
│   │   └── monacoTheme.ts     # Monaco 编辑器主题
│   └── main.tsx               # 渲染进程入口
├── public/                    # 静态资源（图标、favicon）
├── website/                   # 官网 HTML（GitHub Pages）
└── package.json
```

---

## 🔧 开发模式

```bash
# 安装依赖
npm install

# 启动开发（Vite + Electron）
npm run electron:dev

# 构建前端
npm run build

# 打包 Electron（产出在 release/）
npm run electron:build
```

---

## 更新日志

### v1.2.9（2026-07-04）

- 🎨 **自定义背景图像 + 透明度调整**：设置面板新增「外观设置」Tab，支持上传自定义背景图片，0%–100% 透明度自由调节
- 🐧 **Linux 版本支持**：全新适配 Linux 平台（AppImage + deb），用户可自行克隆仓库构建
- 🔗 **官网迁移至 GitHub Pages**：原域名服务商故障，官网迁移至 [GitHub Pages](https://666-gy.github.io/Yanxi-Code/website/index.html)
- 🧹 **移除 Agent 功能**：沉淀研究 Agent 实现，暂时移除对话助手功能

### v1.2.8（2026-07-02）

- 🚀 **DeepSeek V4 模型迁移**：升级至 V4 Flash / V4 Pro，旧模型自动迁移
- 💰 **API 累加计费统计**：实时统计 token 消耗，重启不归零，画布/译行全部计入
- 🧠 **代码补全优化**：本地 Worker 摆脱 CDN 依赖，新增 Python / Java / C / C++ / C# / Go / Rust 关键词和代码片段补全
- 📝 **Markdown 预览**：右键 `.md` 文件查看预览，支持完整 Markdown 渲染，深色主题适配
- 🐛 **修复**：Yan Board 画布横栏关闭文件无效的 bug，横栏关闭保留侧栏历史记录
- 🐛 **修复**：画布拖拽文件无反应问题（Electron 安全策略导致 `file.path` 不可用）
- 🐛 **修复**：画布 API 调用失败静默降级问题，改为明确报错提示

### v1.2.0（2026-07-01）

- 🖼️ **Yan Board 大幕布**：模块化讲解代码，可视化学习
- 🎓 **译行品牌升级**：边写边译功能更名，按行触发翻译，一句话释义
- 🔄 **软件内检查更新**：安装版支持一键检测新版本
- 🎬 **Loading 动画优化**：双层旋转 + 弹跳圆点

### v1.1.0（2026-06-30）

- 📝 Markdown 预览功能（右键 `.md` 文件查看/恢复编辑）
- 🖼️ 画布空间简化为直接拖拽分析
- 🎬 文件分析 Loading 动画（环形进度 + 百分比 + 步骤）
- 🐛 修复文件树子文件夹导致空列表的 bug

### v1.0.0（2026-06-30）

- 🎉 首次发布
- AI 实时翻译解释代码（边写边译）
- Monaco Editor 代码编辑器
- 文件树实时监听
- 系统托盘常驻

---

## 📝 License

[MIT License](LICENSE)

---

<div align="center">

**Yanxi Code** — 让每一个初学者，都能边写边懂。

</div>
