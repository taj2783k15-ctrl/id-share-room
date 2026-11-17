import { isAllowedIdInput } from '../lib/validation.js'
import '../styles/Form.css'

// ID入力欄と送信ボタン
// 入力・ペースト・送信の処理は useIdSender から受け取る
function IdSendForm({
  inputId,
  onInputChange,
  onPasteText,
  onPasteFromClipboard,
  onSubmit,
}) {
  return (
    <div className="room-send-area">
      <input
        type="text"
        className="form-input"
        placeholder="IDを入力"
        autoComplete="off"
        spellCheck={false}
        value={inputId}
        onChange={(e) => onInputChange(e.target.value)}
        onPaste={(e) => {
          // ブラウザ標準の挿入はせず、共通のペースト処理で置き換える
          e.preventDefault()
          onPasteText(e.clipboardData.getData('text'))
        }}
        onCompositionEnd={(e) => {
          // IMEで確定された不正な文字が残らないように元に戻す
          if (!isAllowedIdInput(e.currentTarget.value)) {
            e.currentTarget.value = inputId
          }
        }}
        onFocus={onPasteFromClipboard}
        onMouseEnter={onPasteFromClipboard}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            onSubmit()
          }
        }}
      />

      <button className="menu-button primary" onClick={onSubmit}>
        送信
      </button>
    </div>
  )
}

export default IdSendForm
