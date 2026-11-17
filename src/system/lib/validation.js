// システム用の入力チェック（ID・合言葉・ニックネーム・定員）

// ---------- ID ----------

export const ID_LENGTH = 8

// 入力欄に入れてよい文字列（半角英数字のみ・0～8文字）
const ID_INPUT_PATTERN = /^[A-Za-z0-9]{0,8}$/
// 送信してよい文字列（半角英数字のみ・1～8文字）
const ID_SEND_PATTERN = /^[A-Za-z0-9]{1,8}$/
// 自動送信の対象（半角英数字のみ・ちょうど8文字）
const ID_AUTO_SEND_PATTERN = /^[A-Za-z0-9]{8}$/

export const isAllowedIdInput = (text) => ID_INPUT_PATTERN.test(text)
export const isSendableId = (text) => ID_SEND_PATTERN.test(text)
export const isAutoSendableId = (text) => ID_AUTO_SEND_PATTERN.test(text)

// 大文字・小文字を区別せずに比較する
export const isSameId = (a, b) => a.toLowerCase() === b.toLowerCase()

// ---------- 合言葉：半角英数字4文字 ----------

export const PASSPHRASE_LENGTH = 4
export const PASSPHRASE_INPUT_PATTERN = /^[A-Za-z0-9]{0,4}$/

export const getPassphraseError = (passphrase) => {
  if (passphrase.length === 0) return '合言葉を入力してください'

  if (
    passphrase.length !== PASSPHRASE_LENGTH ||
    !PASSPHRASE_INPUT_PATTERN.test(passphrase)
  ) {
    return `合言葉は半角英数字4文字で入力してください（現在${passphrase.length}文字）`
  }

  return ''
}

// ---------- ニックネーム：2文字固定（文字の種類は問わない） ----------

const NICKNAME_LENGTH = 2

// 見た目の1文字（絵文字や結合文字を含む）を1文字として数える
// Intl.Segmenterが使えないブラウザではコードポイント単位で数える
const graphemeSegmenter =
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
    : null

const countChars = (text) =>
  graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(text)).length
    : Array.from(text).length

export const getNicknameError = (nickname) => {
  const length = countChars(nickname)

  if (length === 0) return 'ニックネームを入力してください'

  if (nickname.trim() === '') {
    return '空白だけのニックネームは使用できません'
  }

  if (length !== NICKNAME_LENGTH) {
    return `ニックネームは2文字で入力してください（現在${length}文字）`
  }

  return ''
}

// ---------- 定員（ホスト本人を含む） ----------

export const CAPACITY_OPTIONS = [2, 3, 4, 5]

export const getCapacityError = (capacity) =>
  CAPACITY_OPTIONS.includes(capacity) ? '' : '定員は2～5人から選択してください'
