// テキスト入力中かどうか（キーボードショートカットを無効にする判定）

const NON_TEXT_INPUT_TYPES = [
  'range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file',
]

export const isTextEntryElement = (element) => {
  if (!element) return false
  if (element.isContentEditable) return true

  const tagName = element.tagName

  if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true

  if (tagName === 'INPUT') {
    return !NON_TEXT_INPUT_TYPES.includes(element.type)
  }

  return false
}
