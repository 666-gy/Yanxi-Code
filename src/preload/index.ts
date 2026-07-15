import { contextBridge } from 'electron'
contextBridge.exposeInMainWorld('api', { ready: true })
