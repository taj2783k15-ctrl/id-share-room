import { useState } from 'react'
import {
  clearSharedIds,
  kickParticipant,
  leaveRoom,
} from '../lib/roomService.js'
import { getColumns } from '../lib/participants.js'
import {
  getVisibleEntries,
  markHistoryEntryCopied,
} from '../lib/history.js'
import { isSameId } from '../lib/validation.js'
import { useRoomSync } from '../hooks/useRoomSync.js'
import { useIdSender } from '../hooks/useIdSender.js'
import { useShortcutKeys } from '../hooks/useShortcutKeys.js'
import RoomHeader from '../components/RoomHeader.jsx'
import ParticipantColumn, { EmptyColumn } from '../components/ParticipantColumn.jsx'
import IdSendForm from '../components/IdSendForm.jsx'
import RoomMessageScreen from '../components/RoomMessageScreen.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import '../styles/Room.css'

// ルーム内画面
// session : { passphrase, nickname, participantId, isHost }
// onExit  : トップ画面へ戻る（退室処理は呼び出し前に済ませる）
function RoomScreen({ session, onExit }) {
  const { passphrase, nickname, participantId } = session

  const [volume, setVolume] = useState(100)
  // 確認ダイアログ { message, confirmLabel, onConfirm }
  const [dialog, setDialog] = useState(null)

  const {
    room,
    roomDataRef,
    history,
    historyRef,
    setHistory,
    lastId,
    setLastId,
    endedMessage,
    endedRef,
  } = useRoomSync({ session, volume, onEnd: () => setDialog(null) })

  const amHost = room?.hostId === participantId

  // 重複判定：表示中の全参加者の最新2件と比較する
  const isDuplicate = (value) => {
    const { self, others } = getColumns(
      roomDataRef.current,
      participantId,
      nickname
    )

    return getVisibleEntries(historyRef.current, [self, ...others]).some(
      (entry) => isSameId(entry.value, value)
    )
  }

  const {
    inputId,
    submitId,
    applyPastedText,
    pasteFromClipboard,
    handleInputChange,
  } = useIdSender({
    passphrase,
    participantId,
    isDuplicate,
    onSent: setLastId,
  })

  // クリップボードへコピー（コピー済みとして灰色にし、直前のIDに入れる）
  const copyEntry = async (ownerId, entry) => {
    try {
      await navigator.clipboard.writeText(entry.value)

      setHistory((prevHistory) =>
        markHistoryEntryCopied(prevHistory, ownerId, entry.key)
      )
      setLastId(entry.value)
    } catch {
      console.log('クリップボードへのコピーに失敗しました')
    }
  }

  // キーボードショートカット
  // Q   : 入力欄への貼り付け（通常のペーストと同じ処理）
  // 1～4: 見出しの番号の人の最新IDをコピー
  useShortcutKeys((key, e) => {
    if (endedRef.current || dialog || !room) return

    if (key === 'q') {
      e.preventDefault()
      pasteFromClipboard()
      return
    }

    if (['1', '2', '3', '4'].includes(key)) {
      e.preventDefault()

      const { others } = getColumns(room, participantId, nickname)
      const target = others[Number(key) - 1]
      const latest = target && history[target.id]?.[0]

      if (latest) {
        copyEntry(target.id, latest)
      }
    }
  })

  // Firebase上の共有IDデータだけを削除（各参加者の画面の履歴は残る）
  const handleClearSharedIds = () => {
    setDialog({
      message:
        'Firebase上の共有IDデータを削除しますか？（各参加者の画面の履歴は消えません）',
      confirmLabel: '全件削除',
      onConfirm: async () => {
        setDialog(null)

        try {
          await clearSharedIds(passphrase)
        } catch {
          console.log('全件削除に失敗しました')
        }
      },
    })
  }

  const handleKick = (target) => {
    setDialog({
      message: `${target.nickname} さんをキックしますか？`,
      confirmLabel: 'キック',
      onConfirm: async () => {
        setDialog(null)

        try {
          await kickParticipant(passphrase, target.id)
        } catch {
          console.log('キックに失敗しました')
        }
      },
    })
  }

  // 参加者：退室／ホスト：ルーム解散
  const handleLeave = () => {
    setDialog({
      message: amHost
        ? 'ルームを解散しますか？全員が退室し、ルームのデータは削除されます。'
        : 'ルームから退室しますか？',
      confirmLabel: amHost ? 'ルーム解散' : '退室',
      onConfirm: () => {
        setDialog(null)
        leaveRoom({ ...session, isHost: amHost }).catch(() => {})
        onExit()
      },
    })
  }

  if (endedMessage) {
    return <RoomMessageScreen message={endedMessage} onBack={onExit} />
  }

  if (!room) {
    return <RoomMessageScreen message="接続中…" />
  }

  const { participants, self, others } = getColumns(
    room,
    participantId,
    nickname
  )
  const capacity = room.capacity ?? 0
  const emptySlotCount = Math.max(0, capacity - 1 - others.length)

  const renderColumn = (member, heading, isSelf) => (
    <ParticipantColumn
      key={member.id}
      heading={heading}
      nickname={member.nickname}
      isSelf={isSelf}
      isHostMember={room.hostId === member.id}
      entries={history[member.id] ?? []}
      onCopy={(entry) => copyEntry(member.id, entry)}
      onKick={amHost && !isSelf ? () => handleKick(member) : undefined}
    />
  )

  return (
    <div className="room-screen">
      <RoomHeader
        passphrase={room.passphrase}
        participantCount={participants.length}
        capacity={capacity}
        amHost={amHost}
        volume={volume}
        onVolumeChange={setVolume}
      />

      {/* 左から「自分」「1」～「4」、空いている枠は「空き」 */}
      <div className="room-columns-scroll">
        <div className="room-columns">
          {renderColumn(self, '自分', true)}

          {others.map((member, index) =>
            renderColumn(member, String(index + 1), false)
          )}

          {Array.from({ length: emptySlotCount }, (_, index) => (
            <EmptyColumn
              key={`empty-${index}`}
              heading={others.length + index + 1}
            />
          ))}
        </div>
      </div>

      {/* 最初から表示しておき、値が入っても画面がずれないようにする */}
      <div className="room-last-id">
        直前のID：<span className="room-last-id-value">{lastId}</span>
      </div>

      <IdSendForm
        inputId={inputId}
        onInputChange={handleInputChange}
        onPasteText={applyPastedText}
        onPasteFromClipboard={pasteFromClipboard}
        onSubmit={() => submitId(inputId)}
      />

      <div className="room-actions">
        <button className="menu-button" onClick={handleClearSharedIds}>
          全件削除
        </button>

        <button
          className={`menu-button ${amHost ? 'danger' : ''}`}
          onClick={handleLeave}
        >
          {amHost ? 'ルーム解散' : '退室'}
        </button>
      </div>

      {dialog && (
        <ConfirmDialog
          dialog={dialog}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}

export default RoomScreen
