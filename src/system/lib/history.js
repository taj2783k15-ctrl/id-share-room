// ルーム内画面のID履歴（画面上だけで持つデータ）
//
// history の形：{ [参加者ID]: [{ key, value, status }, ...] }
//   - 新しい順に最大 HISTORY_SIZE 件
//   - key    … Firebase のメッセージキー（送信順に並ぶ）
//   - status … 'new'（未コピー）か 'copied'（コピー済み・灰色）

export const HISTORY_SIZE = 2

// 再読み込み後に同じIDを二重に表示しないために覚えておくキーの件数
export const MAX_SEEN_KEYS = 100

// 受信したIDを先頭に追加する（古いものは HISTORY_SIZE 件を超えたら捨てる）
export const addHistoryEntry = (history, ownerId, entry) => ({
  ...history,
  [ownerId]: [entry, ...(history[ownerId] ?? [])].slice(0, HISTORY_SIZE),
})

// 指定したIDをコピー済みにする
export const markHistoryEntryCopied = (history, ownerId, key) => ({
  ...history,
  [ownerId]: (history[ownerId] ?? []).map((item) =>
    item.key === key ? { ...item, status: 'copied' } : item
  ),
})

// 表示中の参加者のIDをまとめて取り出す（重複判定に使う）
export const getVisibleEntries = (history, members) =>
  members.flatMap((member) => history[member.id] ?? [])
