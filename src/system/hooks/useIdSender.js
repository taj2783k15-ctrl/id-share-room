import { useRef, useState } from 'react'
import { sendId } from '../lib/roomService.js'
import {
  ID_LENGTH,
  isAllowedIdInput,
  isSendableId,
  isAutoSendableId,
} from '../lib/validation.js'

// ID入力欄と送信（救援用と同じ仕組み）
//
// - 入力欄には半角英数字8文字以内しか入らない
// - ペースト（Ctrl+V・ホバー/フォーカス時の自動貼り付け・Qキー）は入力欄を丸ごと置き換える
// - ちょうど8文字になったら自動送信（isDuplicate が true なら送らない）
// - Enter・送信ボタンでは重複判定をせずに送信する
//
// isDuplicate(value) : 表示中のIDと重複しているか
// onSent(value)      : 送信に成功したとき（直前のIDの更新に使う）
export function useIdSender({ passphrase, participantId, isDuplicate, onSent }) {
  const [inputId, setInputId] = useState('')
  const sendingRef = useRef(false)

  // IDを送信する（自動送信・明示的な送信の共通処理）
  // 重複判定は自動送信のときだけ行う（Enter・送信ボタンなら同じIDも送れる。救援用と同じ）
  const submitId = async (value, { auto = false, onSendStarted } = {}) => {
    // 入力欄を経由しない場合に備えて、送信直前にも必ず検証する
    if (!isSendableId(value)) return 'not-sent'

    if (auto && isDuplicate(value)) return 'duplicate-suppressed'

    // 送信中に重ねて送信しない
    if (sendingRef.current) return 'not-sent'

    sendingRef.current = true
    onSendStarted?.()

    try {
      await sendId(passphrase, participantId, value)

      onSent(value)

      // 送信したIDが入力欄に残っていれば消す
      setInputId((prev) => (prev === value ? '' : prev))
      return 'succeeded'
    } catch {
      console.log('Firebaseへの送信に失敗しました')
      return 'failed'
    } finally {
      sendingRef.current = false
    }
  }

  // 自動送信の判定（ちょうど8文字で、重複していなければ送信）
  const tryAutoSubmit = (value) => {
    if (!isAutoSendableId(value)) return

    submitId(value, { auto: true })
  }

  // ペーストされた文字列で入力欄を置き換える（すべてのペーストの共通処理）
  const applyPastedText = (text) => {
    if (!text) return

    // 不正な文字や9文字以上を含む場合は、入力欄を一切変更しない
    if (!isAllowedIdInput(text)) return

    setInputId(text)
    tryAutoSubmit(text)
  }

  // クリップボードから貼り付け
  const pasteFromClipboard = async () => {
    let text

    try {
      text = await navigator.clipboard.readText()
    } catch {
      console.log('クリップボードの読み取りに失敗しました')
      return
    }

    applyPastedText(text)
  }

  // 手入力
  const handleInputChange = (value) => {
    // 半角英数字8文字以内でなければ入力欄に反映しない
    if (!isAllowedIdInput(value)) return

    setInputId(value)

    if (value.length === ID_LENGTH) {
      tryAutoSubmit(value)
    }
  }

  return {
    inputId,
    submitId,
    applyPastedText,
    pasteFromClipboard,
    handleInputChange,
  }
}
