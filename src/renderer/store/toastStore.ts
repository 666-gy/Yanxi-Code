import { create } from 'zustand'
export interface Toast { id: number; message: string; tone: 'info' | 'warn' | 'error' }
interface S { toasts: Toast[]; push: (m: string, t?: Toast['tone']) => void; dismiss: (id: number) => void }
let id = 0
export const useToast = create<S>((set) => ({
  toasts: [],
  push: (m, tone = 'info') => set(s => ({ toasts: [...s.toasts, { id: ++id, message: m, tone }] })),
  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
}))
