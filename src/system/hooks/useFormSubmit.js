import { useState } from 'react'
import { getRoomErrorMessage } from '../lib/roomService.js'

// ルーム作成・参加フォームの送信状態をまとめて扱う
// - submitted   : 一度でも送信ボタンを押したか（未入力エラーの表示に使う）
// - submitting  : Firebaseの処理中か（ボタンを無効にして二重送信を防ぐ）
// - serverError : Firebase側のエラー（合言葉の重複・満員など）
export function useFormSubmit(action) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // hasError が true のときは入力エラーなので送信しない
  const submit = async (hasError, payload) => {
    setSubmitted(true)
    setServerError('')

    if (hasError) return
    if (submitting) return

    setSubmitting(true)

    try {
      // 成功すると画面が切り替わるため、submitting は戻さない
      await action(payload)
    } catch (error) {
      setServerError(getRoomErrorMessage(error))
      setSubmitting(false)
    }
  }

  return { submitted, submitting, serverError, submit }
}
