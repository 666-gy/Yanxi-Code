import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: { build: { rollupOptions: { input: { index: resolve(__dirname, 'src/main/index.ts') } } } },
  preload: { build: { rollupOptions: { input: { index: resolve(__dirname, 'src/preload/index.ts') } } } },
  renderer: {
    root: '.',
    build: { rollupOptions: { input: { index: resolve(__dirname, 'index.html') } } }
  }
})
