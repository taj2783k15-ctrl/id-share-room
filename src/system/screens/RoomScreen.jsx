import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
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
import { onExtensionEvent, requestExtension } from '../lib/browserBridge.js'
import RoomHeader from '../components/RoomHeader.jsx'
import ParticipantColumn, { EmptyColumn } from '../components/ParticipantColumn.jsx'
import IdSendForm from '../components/IdSendForm.jsx'
import RoomMessageScreen from '../components/RoomMessageScreen.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import '../styles/Room.css'

const DIAGNOSTIC_SOURCE = 'kosenjo-id-share-extension'
const DIAGNOSTIC_STAGES = new Set(['capture_check', 'capture_skip', 'capture', 'bridge', 'routing', 'site'])

function normalizeDiagnostic(item) {
  if (!item || typeof item !== 'object') return null
  const stage = typeof item.stage === 'string' ? item.stage : ''
  const reason = typeof item.reason === 'string' ? item.reason : ''
  if (!DIAGNOSTIC_STAGES.has(stage) || !reason) return null
  return {
    at: Number.isFinite(item.at) ? item.at : Date.now(),
    stage,
    reason: reason.replace(/[A-Za-z0-9]{8}/g, '[ID省略]').slice(0, 100),
  }
}

function mergeDiagnostics(previous, incoming) {
  const unique = new Map()
  for (const item of [...previous, ...incoming].map(normalizeDiagnostic).filter(Boolean)) {
    unique.set(`${item.at}:${item.stage}:${item.reason}`, item)
  }
  return [...unique.values()].sort((a, b) => b.at - a.at).slice(0, 20)
}

// ルーム内画面
// session : { passphrase, nickname, participantId, isHost }
// onExit  : トップ画面へ戻る（退室処理は呼び出し前に済ませる）
function RoomScreen({ session, onExit }) {
  const { passphrase, nickname, participantId } = session

  const [volume, setVolume] = useState(100)
  const bridgeEnabledKey = `kosenjo-id-share-enabled:${passphrase}:${participantId}`
  const targetKey = `kosenjo-id-share-target:${passphrase}:${participantId}`
  const [bridgeEnabled, setBridgeEnabled] = useState(() => sessionStorage.getItem(bridgeEnabledKey) === 'true')
  const [targetTabId, setTargetTabId] = useState(() => sessionStorage.getItem(targetKey) || '')
  const [gameTabs, setGameTabs] = useState([])
  const [bridgeStatus, setBridgeStatus] = useState('拡張機能の連携はOFFです')
  const [diagnostics, setDiagnostics] = useState([])
  const remoteIdQueue = useRef(Promise.resolve())

  const reportSiteDiagnostic = (reason) => {
    requestExtension('report-diagnostic', { stage: 'site', reason })
  }

  const handleRemoteId = (value) => {
    if (!bridgeEnabled || !/^[A-Za-z0-9]{8}$/.test(value)) return
    if (!targetTabId) {
      setBridgeStatus('受信IDの入力先GBFタブを選択してください')
      return
    }
    remoteIdQueue.current = remoteIdQueue.current
      .catch(() => {})
      .then(async () => {
        const result = await requestExtension('send-to-game', { tabId: Number(targetTabId), code: value })
        if (result.ok) {
          setBridgeStatus(result.status === 'id-filled' ? '受信IDを指定タブへ入力しました' : '指定タブをID入力画面へ移動しています')
        } else {
          setBridgeStatus(`指定タブへ送れませんでした: ${result.reason || '不明な理由'}`)
        }
      })
  }
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
  } = useRoomSync({ session, volume, onEnd: () => setDialog(null), onRemoteId: handleRemoteId })

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

  const refreshGameTabs = useCallback(async () => {
    const result = await requestExtension('list-game-tabs')
    if (!result.ok) {
      setBridgeStatus(result.reason === 'extension-timeout' ? '拡張機能に接続できません' : 'ゲームタブ一覧を取得できません')
      return
    }
    const tabs = result.tabs || []
    setGameTabs(tabs)
    if (targetTabId && !tabs.some((tab) => String(tab.tabId) === String(targetTabId))) {
      setTargetTabId('')
      sessionStorage.removeItem(targetKey)
    }
    setBridgeStatus(tabs.length ? 'ゲームタブを選択できます' : 'GBFのタブを開いてください')
  }, [targetTabId, targetKey])

  const handleExtensionEvent = useEffectEvent(async (message) => {
    if (message.type === 'captured-id') {
      if (!bridgeEnabled) return
      const result = await submitId(message.code, {
        auto: true,
        onSendStarted: () => reportSiteDiagnostic('firebase_send_started'),
      })
      if (result === 'succeeded') {
        reportSiteDiagnostic('firebase_send_succeeded')
        setBridgeStatus('自発救援IDを共有しました')
      } else if (result === 'duplicate-suppressed') {
        reportSiteDiagnostic('firebase_duplicate_suppressed')
        setBridgeStatus('重複IDのため共有を省略しました')
      } else if (result === 'failed') {
        reportSiteDiagnostic('firebase_send_failed')
        setBridgeStatus('自発救援IDを共有できませんでした')
      } else {
        setBridgeStatus('自発救援IDを送信できませんでした')
      }
    } else if (message.type === 'join-route-status') {
      setBridgeStatus(message.status === 'id-filled'
        ? 'ID入力欄にセットしました（参加確定はゲーム画面で確認）'
        : '指定タブが救援サポーター画面へ進みました')
    }
  })

  const handleDiagnosticMessage = useEffectEvent((event) => {
    if (event.source !== window || event.origin !== location.origin) return
    const message = event.data
    if (message?.source !== DIAGNOSTIC_SOURCE || message.type !== 'diagnostic') return
    setDiagnostics((previous) => mergeDiagnostics(previous, [message.item]))
  })

  useEffect(() => {
    const timer = setTimeout(() => refreshGameTabs(), 0)
    const unsubscribe = onExtensionEvent((message) => handleExtensionEvent(message))
    const onMessage = (event) => handleDiagnosticMessage(event)
    window.addEventListener('message', onMessage)
    requestExtension('get-diagnostics').then((response) => {
      if (response.ok && Array.isArray(response.items)) {
        setDiagnostics((previous) => mergeDiagnostics(previous, response.items))
      }
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('message', onMessage)
    }
  }, [refreshGameTabs])

  const setBridgeEnabledAndStore = (enabled) => {
    sessionStorage.setItem(bridgeEnabledKey, String(enabled))
    setBridgeEnabled(enabled)
    setBridgeStatus(enabled ? '共有連携ON：送信・受信を有効化しました' : '拡張機能の連携はOFFです')
  }

  const setTargetAndStore = (value) => {
    sessionStorage.setItem(targetKey, value)
    setTargetTabId(value)
  }

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

      <section className="room-extension-bridge" aria-label="古戦場システム連携">
        <label className="room-extension-toggle">
          <input
            type="checkbox"
            checked={bridgeEnabled}
            onChange={(event) => setBridgeEnabledAndStore(event.target.checked)}
          />
          古戦場 ID共有を有効にする
        </label>
        <div className="room-extension-controls">
          <select
            aria-label="IDを入力するGBFタブ"
            value={targetTabId}
            onChange={(event) => setTargetAndStore(event.target.value)}
          >
            <option value="">IDを入力するGBFタブを選択</option>
            {gameTabs.map((tab) => (
              <option key={tab.tabId} value={tab.tabId}>
                {tab.title || 'Granblue Fantasy'} — {tab.hash || '#'} (タブ {tab.tabId})
              </option>
            ))}
          </select>
          <button className="menu-button" type="button" onClick={refreshGameTabs}>タブ更新</button>
        </div>
        <div className="room-extension-status" role="status">{bridgeStatus}</div>
        <details className="room-diagnostics">
          <summary>直近の連携診断（{diagnostics.length}件）</summary>
          {diagnostics.length ? (
            <ul>
              {diagnostics.map((item) => (
                <li key={`${item.at}:${item.stage}:${item.reason}`}>
                  <time dateTime={new Date(item.at).toISOString()}>
                    {new Date(item.at).toLocaleTimeString()}
                  </time>{' '}
                  <strong>{item.stage}</strong> / {item.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p>診断記録はありません。</p>
          )}
        </details>
      </section>

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
