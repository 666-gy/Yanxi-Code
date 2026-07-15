import './ConfirmDialog.css'
export function ConfirmDialog({ open, title, message, onCancel, onConfirm }: {
  open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__title">{title}</div>
        <div className="modal__msg">{message}</div>
        <div className="modal__actions">
          <button className="modal__btn" onClick={onCancel}>取消</button>
          <button className="modal__btn modal__btn--primary" onClick={onConfirm}>确认</button>
        </div>
      </div>
    </div>
  )
}
