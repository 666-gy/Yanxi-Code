import { useEffect } from 'react'
import { useToast } from '../../store/toastStore'
import './Toast.css'
export function ToastStack() {
  const toasts = useToast(s => s.toasts); const dismiss = useToast(s => s.dismiss)
  return (
    <div className="toast-stack">
      {toasts.map(t => <ToastItem key={t.id} toast={t} dismiss={() => dismiss(t.id)} />)}
    </div>
  )
}
function ToastItem({ toast, dismiss }: { toast: { message: string; tone: string }; dismiss: () => void }) {
  useEffect(() => { const t = setTimeout(dismiss, 3200); return () => clearTimeout(t) }, [dismiss])
  return <div className={`toast toast--${toast.tone}`} onClick={dismiss}>{toast.message}</div>
}
