import {
  ref,
  child,
  push,
  get,
  set,
  update,
  remove,
  onValue,
  runTransaction,
  onDisconnect,
} from 'firebase/database'
import { database } from '../../firebase'

// システム用ルームのFirebase処理
//
// データ構造（ルームIDには合言葉をそのまま使う）
// rooms/{passphrase}/
//   passphrase, capacity, hostId, createdAt
//   participants/{participantId}: { nickname, joinedAt, active, connected }
//     active    … false はキックされた状態
//     connected … 接続中かどうか（切断しても参加者のデータは消さない）
//   messages/{messageId}: { participantId, value, createdAt }
//
// ルールでルームに participants と messages が常に必要なため、
// messages/init は削除しない固定データとして置いておく

export const INIT_MESSAGE_KEY = 'init'
export const SYSTEM_PARTICIPANT_ID = 'system'
export const MESSAGE_TTL_MS = 3000

const roomsRef = () => ref(database, 'rooms')
export const roomRef = (passphrase) => child(roomsRef(), passphrase)
export const getRoomData = async (passphrase) => (await get(roomRef(passphrase))).val()
export const messagesRef = (passphrase) =>
  child(roomRef(passphrase), 'messages')
const participantsRef = (passphrase) =>
  child(roomRef(passphrase), 'participants')
const participantRef = (passphrase, participantId) =>
  child(participantsRef(passphrase), participantId)

export class RoomError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

const ROOM_ERROR_MESSAGES = {
  PASSPHRASE_TAKEN: 'この合言葉はすでに使われています。別の合言葉にしてください',
  NOT_FOUND: 'この合言葉のルームは見つかりません',
  FULL: 'このルームは満員です',
  NICKNAME_TAKEN: 'このニックネームはルーム内ですでに使われています',
}

export const getRoomErrorMessage = (error) =>
  ROOM_ERROR_MESSAGES[error?.code] ??
  '通信に失敗しました。時間をおいてもう一度お試しください'

const isSameNickname = (a, b) => a.normalize('NFC') === b.normalize('NFC')

// 自分が退室処理中かどうか（自分で消したデータを「ルームから外れた」と誤判定しないため）
const leavingIds = new Set()

export const isLeaving = (participantId) => leavingIds.has(participantId)

// 接続状態の記録
// 接続するたびに connected: true にし、切断時は connected: false にする
// （再読み込みや一時的な切断でルームや参加者のデータが消えないようにする）
export const watchPresence = ({ passphrase, participantId }) => {
  const target = participantRef(passphrase, participantId)

  return onValue(ref(database, '.info/connected'), async (snapshot) => {
    if (snapshot.val() !== true || isLeaving(participantId)) return

    try {
      await onDisconnect(target).update({ connected: false })
      await update(target, { connected: true })
    } catch {
      // 参加者のデータがない場合はルールの検証で失敗する（何もしない）
    }
  })
}

export const createRoom = async ({ passphrase, capacity, nickname }) => {
  const participantId = push(participantsRef(passphrase)).key
  const now = Date.now()

  const roomData = {
    passphrase,
    capacity,
    hostId: participantId,
    createdAt: now,
    participants: {
      [participantId]: {
        nickname,
        joinedAt: now,
        active: true,
        connected: true,
      },
    },
    messages: {
      [INIT_MESSAGE_KEY]: {
        participantId: SYSTEM_PARTICIPANT_ID,
        value: '-',
        createdAt: now,
      },
    },
  }

  // 同じ合言葉のルームがなければ作成する（あれば中止）
  const result = await runTransaction(roomRef(passphrase), (current) => {
    if (current !== null) return undefined
    return roomData
  })

  if (
    !result.committed ||
    result.snapshot.child('hostId').val() !== participantId
  ) {
    throw new RoomError('PASSPHRASE_TAKEN')
  }

  return participantId
}

export const joinRoom = async ({ passphrase, nickname }) => {
  const capacitySnapshot = await get(
    child(roomRef(passphrase), 'capacity')
  )

  if (!capacitySnapshot.exists()) {
    throw new RoomError('NOT_FOUND')
  }

  const capacity = capacitySnapshot.val()
  const participantId = push(participantsRef(passphrase)).key
  let failure = null

  // 定員とニックネームの重複を確認しながら参加者を追加する
  // （切断中の参加者も、再読み込みで戻れるように枠を確保したまま数える）
  const result = await runTransaction(
    participantsRef(passphrase),
    (current) => {
      failure = null

      // 手元にデータがない場合は、サーバーの値で再実行される
      if (current === null) return null

      const activeParticipants = Object.values(current).filter(
        (participant) => participant?.active
      )

      if (activeParticipants.length >= capacity) {
        failure = 'FULL'
        return undefined
      }

      if (
        activeParticipants.some((participant) =>
          isSameNickname(participant.nickname, nickname)
        )
      ) {
        failure = 'NICKNAME_TAKEN'
        return undefined
      }

      return {
        ...current,
        [participantId]: {
          nickname,
          joinedAt: Date.now(),
          active: true,
          connected: true,
        },
      }
    }
  )

  if (failure) throw new RoomError(failure)

  if (!result.committed || !result.snapshot.hasChild(participantId)) {
    throw new RoomError('NOT_FOUND')
  }

  return participantId
}


export const sendId = async (passphrase, participantId, value) => {
  const messageRef = push(messagesRef(passphrase))

  // 送信者が3秒以内に切断しても、共有IDデータが残らないようにする
  onDisconnect(messageRef).remove().catch(() => {})

  await set(messageRef, {
    participantId,
    value,
    createdAt: Date.now(),
  })
}

export const removeMessage = (passphrase, messageId) =>
  remove(child(messagesRef(passphrase), messageId)).catch(() => {})

// Firebase上の共有IDデータだけを削除する（各参加者の画面の履歴は消さない）
export const clearSharedIds = async (passphrase) => {
  const snapshot = await get(messagesRef(passphrase))
  const updates = {}

  snapshot.forEach((messageSnapshot) => {
    if (messageSnapshot.key !== INIT_MESSAGE_KEY) {
      updates[messageSnapshot.key] = null
    }
  })

  if (Object.keys(updates).length === 0) return

  await update(messagesRef(passphrase), updates)
}

// キック：対象者の active を false にする（対象者の画面が検知して退室する）
export const kickParticipant = (passphrase, participantId) =>
  update(participantRef(passphrase, participantId), { active: false })

// 退室：ホストはルームを解散、参加者は自分のデータを削除
export const leaveRoom = async ({ passphrase, participantId, isHost }) => {
  leavingIds.add(participantId)

  const target = participantRef(passphrase, participantId)

  await onDisconnect(target).cancel()

  if (isHost) {
    await remove(roomRef(passphrase))
    return
  }

  await remove(target)
}

// 現在のルーム数を監視する
export const watchRoomCount = (callback) =>
  onValue(
    roomsRef(),
    (snapshot) => callback(snapshot.size),
    () => callback(null)
  )

// すべてのルームを削除する（Firebaseにデータを残さないための掃除用）
// ルールで rooms 自体には書き込めないため、各ルームをまとめて削除する
export const deleteAllRooms = async () => {
  const snapshot = await get(roomsRef())
  const updates = {}

  snapshot.forEach((roomSnapshot) => {
    updates[roomSnapshot.key] = null
  })

  const count = Object.keys(updates).length

  if (count > 0) {
    await update(roomsRef(), updates)
  }

  return count
}
