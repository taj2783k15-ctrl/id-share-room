import { useState } from 'react'
import {
  PASSPHRASE_LENGTH,
  PASSPHRASE_INPUT_PATTERN,
} from '../lib/validation.js'
import '../styles/Form.css'

// 入力欄の下に出すエラーメッセージ（なければ何も表示しない）
export function FieldError({ message }) {
  if (!message) return null

  return <span className="form-hint">{message}</span>
}

// ニックネームの入力欄（文字の種類は問わない。文字数はフォーム側で判定）
export function NicknameInput({ id, value, onChange, error }) {
  return (
    <>
      <input
        id={id}
        type="text"
        className="form-input"
        placeholder="2文字（記号・絵文字も可）"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <FieldError message={error} />
    </>
  )
}

// 合言葉の入力欄（半角英数字以外・5文字以上は入力欄に反映しない）
export function PassphraseInput({ id, value, onChange, error }) {
  const [rejectedMessage, setRejectedMessage] = useState('')

  return (
    <>
      <input
        id={id}
        type="text"
        className="form-input"
        placeholder="半角英数字4文字"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => {
          const nextValue = e.target.value

          if (PASSPHRASE_INPUT_PATTERN.test(nextValue)) {
            setRejectedMessage('')
            onChange(nextValue)
          } else if (nextValue.length > PASSPHRASE_LENGTH) {
            setRejectedMessage('合言葉は4文字までです')
          } else {
            setRejectedMessage('合言葉に使えるのは半角英数字のみです')
          }
        }}
        onCompositionEnd={(e) => {
          // IMEで確定された不正な文字が残らないように元に戻す
          if (!PASSPHRASE_INPUT_PATTERN.test(e.currentTarget.value)) {
            e.currentTarget.value = value
            setRejectedMessage('合言葉に使えるのは半角英数字のみです')
          }
        }}
      />

      <FieldError message={rejectedMessage || error} />
    </>
  )
}
