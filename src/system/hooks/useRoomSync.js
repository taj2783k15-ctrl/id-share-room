import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { onValue, onChildAdded } from 'firebase/database'
import {
  roomRef,
  messagesRef,
  removeMessage,
  leaveRoom,
  watchPresence,
  isLeaving,
  INIT_MESSAGE_KEY,
  SYSTEM_PARTICIPANT_ID,
  MESSAGE_TTL_MS,
} from '../lib/roomService.js'
import {
  clearRoomSession,
  loadRoomHistory,
  saveRoomHistory,
} from '../lib/roomSession.js'
import { addHistoryEntry, MAX_SEEN_KEYS } from '../lib/history.js'
import { playNotificationSound } from '../../shared/notificationSound.js'

// ルームのFirebaseデータと、画面のID履歴を同期する
//
// - ルーム情報（参加者・定員など）を監視する
// - 共有IDを受信して画面の履歴に追加し、Firebase上のデータは3秒後に削除する
// - 画面の履歴と「直前のID」は sessionStorage に保存し、再読み込み後に復元する
// - 接続状態（connected）を記録する
// - 解散・キックなどでルームから外れたら endedMessage を設定する
//
// volume : 受信時の通知音の音量（0～200）
// onEnd  : ルームから外れたときに呼ぶ（開いているダイアログを閉じるなど）
export function useRoomSync({ session, volume, onEnd, onRemoteId }) {
  const { passphrase, participantId } = session

  const [savedHistory] = useState(() =>
    loadRoomHistory(passphrase, participantId)
  )

  const [room, setRoom] = useState(null)
  const [history, setHistory] = useState(() => savedHistory?.history ?? {})
  // 直前にコピーまたは送信したID（表示のみ。重複判定には使わない）
  const [lastId, setLastId] = useState(() => savedHistory?.lastId ?? '')
  const [endedMessage, setEndedMessage] = useState('')

  // 非同期処理やイベントの中から最新の値を参照するためのref
  const roomDataRef = useRef(null)
  const historyRef = useRef(history)
  const seenMessageKeysRef = useRef(new Set(savedHistory?.seenKeys ?? []))
  const messageTimersRef = useRef(new Set())
  const endedRef = useRef(false)

  // 画面の履歴と直前のIDをsessionStorageにも保存（再読み込み後に復元する）
  useEffect(() => {
    historyRef.current = history

    if (endedRef.current) return

    saveRoomHistory({
      passphrase,
      participantId,
      history,
      lastId,
      seenKeys: [...seenMessageKeysRef.current].slice(-MAX_SEEN_KEYS),
    })
  }, [history, lastId, passphrase, participantId])

  // ルームから外れた状態にする（解散・キックなど）
  const endRoom = (message) => {
    endedRef.current = true
    clearRoomSession()
    onEnd()
    setEndedMessage(message)
  }

  const handleRoomSnapshot = useEffectEvent((snapshot) => {
    if (endedRef.current || isLeaving(participantId)) return

    const data = snapshot.val()

    if (!data) {
      endRoom('ルームは解散されました')
      return
    }

    roomDataRef.current = data
    setRoom(data)

    const me = data.participants?.[participantId]

    if (!me) {
      endRoom('ルームから外れました')
      return
    }

    // active が false ならキックされている
    if (me.active === false) {
      leaveRoom(session).catch(() => {})
      endRoom('ホストによって退室させられました')
    }
  })

  const handleRoomError = useEffectEvent(() => {
    endRoom('ルームの情報を読み込めませんでした')
  })

  const handleMessageAdded = useEffectEvent((snapshot) => {
    const key = snapshot.key
    const data = snapshot.val()

    // 固定データ（init）と、表示済みのIDは無視する
    if (key === INIT_MESSAGE_KEY || seenMessageKeysRef.current.has(key)) {
      return
    }

    if (
      !data ||
      typeof data.value !== 'string' ||
      !data.participantId ||
      data.participantId === SYSTEM_PARTICIPANT_ID
    ) {
      return
    }

    seenMessageKeysRef.current.add(key)

    // 自分が送ったIDは最初からコピー済み（灰色）にする
    const isSelf = data.participantId === participantId
    const entry = {
      key,
      value: data.value,
      status: isSelf ? 'copied' : 'new',
    }

    setHistory((prevHistory) =>
      addHistoryEntry(prevHistory, data.participantId, entry)
    )

    // 他の人から受信したIDだけ通知音を鳴らす
    if (!isSelf) {
      playNotificationSound(volume)
      onRemoteId?.(data.value, data.participantId)
    }

    // Firebase上の共有IDデータは3秒後に削除（画面の履歴は残す）
    const timer = setTimeout(() => {
      messageTimersRef.current.delete(timer)
      removeMessage(passphrase, key)
    }, MESSAGE_TTL_MS)

    messageTimersRef.current.add(timer)
  })

  // ルーム情報と共有IDの監視
  useEffect(() => {
    const unsubscribeRoom = onValue(
      roomRef(passphrase),
      (snapshot) => handleRoomSnapshot(snapshot),
      () => handleRoomError()
    )

    const unsubscribeMessages = onChildAdded(
      messagesRef(passphrase),
      (snapshot) => handleMessageAdded(snapshot)
    )

    const timers = messageTimersRef.current

    return () => {
      unsubscribeRoom()
      unsubscribeMessages()
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [passphrase])

  // 接続状態の記録（再読み込み・再接続のたびに接続中に戻す）
  useEffect(
    () => watchPresence({ passphrase, participantId }),
    [passphrase, participantId]
  )

  return {
    room,
    roomDataRef,
    history,
    historyRef,
    setHistory,
    lastId,
    setLastId,
    endedMessage,
    endedRef,
  }
}
