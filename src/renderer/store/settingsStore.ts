import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// DeepSeek 配置 —— base_url 与模型 ID 锁死，仅 apiKey 用户可填
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

export const MODEL_OPTIONS = [
  { id: 'deepseek-v4-flash', label: 'V4 Flash', description: '更快更省，适合日常编码' },
  { id: 'deepseek-v4-pro',   label: 'V4 Pro',   description: '更强推理，适合复杂逻辑' }
] as const
export type ModelId = (typeof MODEL_OPTIONS)[number]['id']

export interface SettingsState {
  apiKey: string
  model: ModelId
  backgroundImage: string | null  // 本地图片路径（file:// 形式或 data URL）
  backgroundOpacity: number       // 0~1，背景图层透明度
  setApiKey: (k: string) => void
  setModel: (m: ModelId) => void
  setBackgroundImage: (p: string | null) => void
  setBackgroundOpacity: (o: number) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      model: 'deepseek-v4-flash',
      backgroundImage: null,
      backgroundOpacity: 0.35,
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
      setBackgroundOpacity: (backgroundOpacity) => set({ backgroundOpacity })
    }),
    { name: 'yanxi-settings' }
  )
)
