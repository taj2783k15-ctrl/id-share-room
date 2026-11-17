import './ConfirmDialog.css'

// 確認ダイアログ
// dialog: { message, confirmLabel, onConfirm }
// 背景をクリックするか「キャンセル」で閉じる
function ConfirmDialog({ dialog, onCancel }) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="dialog-message">{dialog.message}</p>

        <div className="dialog-buttons">
          <button className="menu-button" onClick={onCancel}>
            キャンセル
          </button>

          <button
            className="menu-button danger"
            onClick={dialog.onConfirm}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
