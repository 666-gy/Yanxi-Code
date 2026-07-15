import { useState, useEffect, useRef } from 'react'
import './ConfirmDialog.css'

export function PromptDialog({ open, title, label, defaultValue, onCancel, onConfirm }: {
  open: boolean
  title: string
  label?: string
  defaultValue?: string
  onCancel: () => void
  onConfirm: (value: string) => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue ?? '')
      const t = setTimeout(() => inputRef.current?.select(), 50)
      return () => clearTimeout(t)
    }
  }, [open, defaultValue])

  if (!open) return null

  const submit = () => {
    const v = value.trim()
    if (v) onConfirm(v)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__title">{title}</div>
        {label && <div className="modal__msg">{label}</div>}
        <input
          ref={inputRef}
          className="prompt-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit() }
            if (e.key === 'Escape') onCancel()
          }}
        />
        <div className="modal__actions">
          <button className="modal__btn" onClick={onCancel}>取消</button>
          <button className="modal__btn modal__btn--primary" onClick={submit}>确认</button>
        </div>
      </div>
    </div>
  )
}
