// 参加中のルーム情報（合言葉・自分の参加者ID・ニックネーム・ホストか）
// 再読み込み時に同じルームへ戻るため、タブを閉じるまで保持する
const ROOM_SESSION_KEY = 'id-share-room-system-room'

export const saveRoomSession = (room) => {
  sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(room))
}

export const loadRoomSession = () => {
  try {
    const savedRoom = sessionStorage.getItem(ROOM_SESSION_KEY)
    const room = savedRoom ? JSON.parse(savedRoom) : null

    // 仮実装の頃の形式など、必要な情報がないものは使わない
    if (
      typeof room?.passphrase !== 'string' ||
      typeof room?.participantId !== 'string' ||
      typeof room?.nickname !== 'string'
    ) {
      return null
    }

    return room
  } catch {
    return null
  }
}

export const clearRoomSession = () => {
  sessionStorage.removeItem(ROOM_SESSION_KEY)
  sessionStorage.removeItem(ROOM_HISTORY_KEY)
}

// ルーム内画面のID履歴と直前のID（再読み込みしても画面の表示を残すため）
// { passphrase, participantId, history, lastId, seenKeys }
const ROOM_HISTORY_KEY = 'id-share-room-system-history'

export const saveRoomHistory = (data) => {
  sessionStorage.setItem(ROOM_HISTORY_KEY, JSON.stringify(data))
}

export const loadRoomHistory = (passphrase, participantId) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ROOM_HISTORY_KEY))

    // 別のルーム・別の参加者の履歴は使わない
    if (
      saved?.passphrase !== passphrase ||
      saved?.participantId !== participantId
    ) {
      return null
    }

    return saved
  } catch {
    return null
  }
}
