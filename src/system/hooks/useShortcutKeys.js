import { useEffect, useEffectEvent } from 'react'
import { isTextEntryElement } from '../lib/dom.js'

// ページ全体のキーボードショートカット
// 次の場合は onKey を呼ばない（通常の文字入力やブラウザの操作を妨げないため）
// - Ctrl・Alt・Meta と一緒に押したとき
// - 押しっぱなし、IME変換中
// - テキスト入力欄にフォーカスがあるとき
//
// onKey(key, event) : key は小文字にしたキー名
export function useShortcutKeys(onKey) {
  const handleKeyDown = useEffectEvent((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.repeat || e.isComposing) return
    if (isTextEntryElement(e.target)) return

    onKey(e.key.toLowerCase(), e)
  })

  useEffect(() => {
    const listener = (e) => handleKeyDown(e)

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [])
}
