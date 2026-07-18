<div align="center">
  <img src="src/renderer/assets/logo.svg" width="96" alt="Yanxi Code logo" />
  <h1>Yanxi Code</h1>
  <p>A lightweight desktop editor connecting code and intelligent agents</p>
  <p><strong>v1.3.0</strong></p>
  <p><a href="README.md">简体中文</a> · <a href="docs/index.html">Website</a></p>
</div>

Yanxi Code is a desktop code editor built for the two-way Yanxi workflow. It combines a full Monaco Editor workspace with bidirectional workspace handoff to Yan Agent. Its built-in Yan Teach feature can also use DeepSeek to turn selected code or an entire file into a Chinese Markdown explanation.

## Download

The installer and portable builds will be published through GitHub Releases after the repository is created. Both entries are prepared in the [website download section](docs/index.html#download) and will link directly to their corresponding Release assets.

> [!IMPORTANT]
> Install Yanxi Code from an **administrator account**. Otherwise, workspace synchronization from Yan Agent to Yanxi Code may fail.

| Build | Use case | Distribution |
| --- | --- | --- |
| Windows installer | Permanent setup with install directory and shortcuts | GitHub Release |
| Windows portable | Runs directly without installation | GitHub Release |

## Screenshots

### Workspace entry

Open a local workspace from the welcome screen or title bar. The right activity bar provides direct access to Yan Teach, Yan Agent, and Settings.

<p align="center">
  <img src="docs/assets/yanxi-code-app.png" width="960" alt="Yanxi Code workspace entry" />
</p>

### About and two-way integration

The About page shows the current version together with the Yan Agent handoff and Yan Teach capabilities.

<p align="center">
  <img src="docs/assets/yanxi-code-about.png" width="960" alt="Yanxi Code About page" />
</p>

## Features

- **Two-way Yan Agent integration**: launch Yan Agent with the active Yanxi Code workspace, or accept a workspace switch initiated by Yan Agent.
- **Monaco editing experience**: multi-tab editing, syntax highlighting, suggestions, bracket pairing, a file tree, Markdown preview, and unsaved-change protection.
- **Yan Teach explanations**: stream an explanation for selected code or a complete file and save it under `.yan-teach/*.md` in the workspace.
- **Live workspace updates**: watch external file creation, modification, and deletion and reflect changes in the tree and editor.
- **Desktop integration**: light and dark themes, system tray behavior, keyboard shortcuts, and Windows installer and portable builds.

## Two-Way Workflow

| Direction | Behavior | Protection |
| --- | --- | --- |
| Yanxi Code → Yan Agent | Launch or raise Yan Agent and hand off the active workspace | Only local paths and request state are shared; project files are not copied |
| Yan Agent → Yanxi Code | Ask Yanxi Code to open or switch workspaces | Paths are validated, and automatic switching is blocked when edits are unsaved |
| Yan Teach → Workspace | Explain selected code or a complete file | Results are stored under `.yan-teach/*.md` and can be reopened in the editor |

## Quick Start

The current release primarily targets Windows 10/11 x64. Node.js 22 or newer is recommended for development.

```powershell
# Run inside a cloned Yanxi Code repository
npm ci
npm run dev
```

After launch, select **Open Workspace** and choose a project directory. Common shortcuts:

| Action | Shortcut |
| --- | --- |
| Open a workspace | `Ctrl+O` |
| Save the active file | `Ctrl+S` |
| Create a file | `Ctrl+N` |
| Create a folder | `Ctrl+Shift+N` |
| Close the active tab | `Ctrl+W` |

## Connect Yan Agent

1. Install [Yan Agent](https://github.com/666-gy/Yan-Agent/releases) and make sure `Yan Agent.exe` is available on the system `PATH`.
2. Open a workspace in Yanxi Code.
3. Select the Yan Agent icon in the right activity bar. Yanxi Code launches the agent and hands off the active workspace.

Yan Agent can also ask Yanxi Code to open a workspace. If the editor has unsaved changes, Yanxi Code blocks the automatic switch and displays a warning.

## Configure Yan Teach

1. Open **Settings** at the bottom of the right activity bar.
2. Enter a DeepSeek API key under **Model Configuration** and select a model.
3. Use the Yan Teach panel for a complete file, or select code and start an explanation from the editor context menu.

The API key stays in local application storage. Code or file content is sent directly to the configured official DeepSeek endpoint only when you explicitly start a Yan Teach request.

## Local Data and Privacy

- Workspace files remain in their original directories; Yanxi Code does not upload the complete project.
- Yan Agent workspace handoffs use local files and launch arguments.
- The DeepSeek API key stays in local application storage.
- Code is sent to `https://api.deepseek.com` only when you explicitly start a Yan Teach request.

## Development Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Electron development environment |
| `npm test` | Run the Vitest test suite |
| `npm run build` | Build the main, preload, and renderer processes |
| `npm run dist` | Build Windows installer and portable packages |
| `npm run dist:portable` | Build only the Windows portable package |

## Stack

Electron, React, TypeScript, Vite, Monaco Editor, Zustand, and Vitest.

Visit the [Yanxi Code website](docs/index.html) for the product overview and usage guide.
