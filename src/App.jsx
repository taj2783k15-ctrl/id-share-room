
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  ref,
  push,
  onChildAdded,
  remove,
} from 'firebase/database'
import { database } from './firebase'
import { onExtensionEvent, requestExtension } from './system/lib/browserBridge.js'
import ExpansionControls from './ExpansionControls.jsx'
import './App.css'

const STORAGE_KEY = 'id-share-room-ids'
const CLIENT_KEY = 'id-share-room-client-id'
const LAST_ID_KEY = 'id-share-room-last-id'
const EXPANSION_ENABLED_KEY = 'kosenjo-id-share-expansion-enabled'
const EXPANSION_TARGET_KEY = 'kosenjo-id-share-expansion-target'
const EXPANSION_DELIVERED_KEY = 'kosenjo-id-share-expansion-delivered'

const ID_LENGTH = 8

// 入力欄に入れてよい文字列（半角英数字のみ・0～8文字）
const INPUT_PATTERN = /^[A-Za-z0-9]{0,8}$/
// 送信してよい文字列（半角英数字のみ・1～8文字）
const SEND_PATTERN = /^[A-Za-z0-9]{1,8}$/
// 自動送信の対象（半角英数字のみ・ちょうど8文字）
const AUTO_SEND_PATTERN = /^[A-Za-z0-9]{8}$/

const isAllowedInput = (text) => INPUT_PATTERN.test(text)

// 大文字・小文字を区別せずに比較する
const isSameId = (a, b) => a.toLowerCase() === b.toLowerCase()

// テキスト入力中かどうか（ショートカットを無効にする判定）
const NON_TEXT_INPUT_TYPES = [
  'range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file',
]

const isTextEntryElement = (element) => {
  if (!element) return false
  if (element.isContentEditable) return true

  const tagName = element.tagName

  if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true

  if (tagName === 'INPUT') {
    return !NON_TEXT_INPUT_TYPES.includes(element.type)
  }

  return false
}

function App({ extensionMode = false }) {
  const [inputId, setInputId] = useState('')
  const [clientId] = useState(() => {
    let id = sessionStorage.getItem(CLIENT_KEY)

    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(CLIENT_KEY, id)
    }

    return id
  })

  const [ids, setIds] = useState(() => {
    try {
      const savedIds = sessionStorage.getItem(STORAGE_KEY)
      return savedIds ? JSON.parse(savedIds) : []
    } catch (error) {
      console.log('履歴の読み込みに失敗しました')
      return []
    }
  })

  const [volume, setVolume] = useState(100)

  // 直前にコピーまたは送信したID（1件だけ記憶）
  const [lastId, setLastId] = useState(
    () => sessionStorage.getItem(LAST_ID_KEY) ?? ''
  )

  // クリップボード操作の失敗などをユーザーに知らせるメッセージ
  const [notice, setNotice] = useState('')
  const [extensionEnabled, setExtensionEnabled] = useState(() =>
    extensionMode && sessionStorage.getItem(EXPANSION_ENABLED_KEY) === 'true'
  )
  const [targetTabId, setTargetTabId] = useState(() =>
    extensionMode ? sessionStorage.getItem(EXPANSION_TARGET_KEY) || '' : ''
  )
  const [gameTabs, setGameTabs] = useState([])
  const [extensionStatus, setExtensionStatus] = useState(() =>
    extensionMode && sessionStorage.getItem(EXPANSION_ENABLED_KEY) === 'true'
      ? 'タブを更新して入力先を確認してください'
      : '拡張機能の連携はOFFです'
  )

  // 非同期処理の途中でも最新の値を参照するためのref
  const idsRef = useRef(ids)
  const lastIdRef = useRef(lastId)
  const sendingRef = useRef(false)
  const noticeTimerRef = useRef(null)
  const deliveryQueueRef = useRef(Promise.resolve())
  const deliveredIdsRef = useRef((() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(EXPANSION_DELIVERED_KEY) || '[]')
      return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [])
    } catch {
      return new Set()
    }
  })())

  // Reactの履歴が変わったらsessionStorageにも保存
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    idsRef.current = ids
  }, [ids])

  useEffect(() => {
    return () => clearTimeout(noticeTimerRef.current)
  }, [])

  const showNotice = (message) => {
    setNotice(message)
    clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(''), 3000)
  }

  // 記憶しているIDを更新する（コピー・送信が実行された後にだけ呼ぶ）
  const rememberId = (value) => {
    lastIdRef.current = value
    setLastId(value)
    sessionStorage.setItem(LAST_ID_KEY, value)
  }

  // ポロン♪という通知音
  // useEffectEventにすることで、音量を変えてもFirebaseの監視をやり直さない
  const playNotificationSound = useEffectEvent(() => {
    try {
      const audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = 'sine'

      oscillator.frequency.setValueAtTime(
        660,
        audioContext.currentTime
      )

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime + 0.12
      )

      gainNode.gain.setValueAtTime(
        volume / 100 * 0.2,
        audioContext.currentTime
      )

      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.5
      )

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.5)

      oscillator.onended = () => {
        audioContext.close()
      }
    } catch (error) {
      console.log('通知音の再生に失敗しました')
    }
  })

  const deliverIncomingId = useEffectEvent((messageId, data) => {
    if (!extensionMode || !extensionEnabled || !AUTO_SEND_PATTERN.test(data.value || '')) return
    if (!Number.isFinite(data.createdAt) || Date.now() - data.createdAt > 10000) return
    if (deliveredIdsRef.current.has(messageId)) return
    if (!targetTabId) {
      setExtensionStatus('IDの入力先GBFタブを選択してください')
      return
    }
    deliveredIdsRef.current.add(messageId)
    const recent = [...deliveredIdsRef.current].slice(-50)
    deliveredIdsRef.current = new Set(recent)
    sessionStorage.setItem(EXPANSION_DELIVERED_KEY, JSON.stringify(recent))
    deliveryQueueRef.current = deliveryQueueRef.current.then(async () => {
      const result = await requestExtension('send-to-game', { tabId: Number(targetTabId), code: data.value, autoStart: true })
      setExtensionStatus(result.ok
        ? (result.status === 'id-filled' ? '指定タブのID入力欄にセットしました' : '指定タブをID入力画面へ移動しています')
        : `IDを指定タブへ送れませんでした: ${result.reason || '不明な理由'}`)
    }).catch(() => setExtensionStatus('IDを指定タブへ送れませんでした'))
  })

  // FirebaseのID一覧を監視
  useEffect(() => {
    const idsRef = ref(database, 'ids')

    const unsubscribeAdded = onChildAdded(idsRef, (snapshot) => {
      const data = snapshot.val()

      if (!data) return

      const isSelf = data.sender === clientId

      const newItem = {
        id: snapshot.key,
        value: data.value,
        status: isSelf ? 'copied' : 'new',
      }

      setIds((prevIds) => {
        // すでに履歴にあるIDなら追加しない
        if (prevIds.some((item) => item.id === newItem.id)) {
          return prevIds
        }

        // 5件を超える場合は一番古いIDを削除
        if (prevIds.length >= 5) {
          const oldestItem = prevIds[prevIds.length - 1]

          remove(ref(database, `ids/${oldestItem.id}`))
        }

        return [newItem, ...prevIds].slice(0, 5)
      })

      // 他の人から受信したIDだけ通知音を鳴らす
      if (!isSelf) {
        playNotificationSound()
        deliverIncomingId(newItem.id, data)
      }

      // 3秒後に赤 → 青
      if (!isSelf) {
        setTimeout(() => {
          setIds((prevIds) =>
            prevIds.map((item) =>
              item.id === newItem.id && item.status === 'new'
                ? { ...item, status: 'old' }
                : item
            )
          )
        }, 3000)
      }

      // 5秒後にFirebaseからだけ削除
      setTimeout(() => {
        remove(ref(database, `ids/${newItem.id}`))
      }, 5000)
    })

    return () => {
      unsubscribeAdded()
    }
  }, [clientId])

  // IDを送信する（自動送信・明示的な送信の共通処理）
  const submitId = async (value, { auto = false } = {}) => {
    // 入力欄を経由しない場合に備えて、送信直前にも必ず検証する
    if (!SEND_PATTERN.test(value)) {
      showNotice('送信できるのは半角英数字8文字以内です')
      return false
    }

    if (auto && (!AUTO_SEND_PATTERN.test(value) ||
      idsRef.current.some((item) => isSameId(item.value, value)) ||
      (lastIdRef.current && isSameId(lastIdRef.current, value)))) return false

    // 送信中に重ねて送信しない
    if (sendingRef.current) return false

    sendingRef.current = true

    try {
      await push(ref(database, 'ids'), {
        value,
        createdAt: Date.now(),
        sender: clientId,
      })

      // 送信が実行された後で記憶を更新する
      rememberId(value)

      // 送信したIDが入力欄に残っていれば消す
      setInputId((prev) => (prev === value ? '' : prev))
      return true
    } catch (error) {
      console.log('Firebaseへの送信に失敗しました')
      showNotice('送信に失敗しました')
      return false
    } finally {
      sendingRef.current = false
    }
  }

  // 自動送信の判定
  const tryAutoSubmit = (value) => {
    if (!AUTO_SEND_PATTERN.test(value)) return

    // 表示中の履歴と一致するIDは自動送信しない
    if (idsRef.current.some((item) => isSameId(item.value, value))) return

    // 更新前の記憶と比較してから送信する（記憶の更新は送信後）
    if (lastIdRef.current && isSameId(lastIdRef.current, value)) return

    submitId(value, { auto: true })
  }

  const refreshGameTabs = async () => {
    const result = await requestExtension('list-game-tabs')
    if (!result.ok) {
      setExtensionStatus(result.reason === 'extension-timeout'
        ? '拡張機能に接続できません'
        : `ゲームタブ一覧を取得できません: ${result.reason || '理由不明'}`)
      return
    }
    setGameTabs(result.tabs || [])
    setExtensionStatus((result.tabs || []).length ? 'ゲームタブを選択できます' : 'GBFのタブを開いてください')
  }

  const handleEnabledChange = (enabled) => {
    sessionStorage.setItem(EXPANSION_ENABLED_KEY, String(enabled))
    setExtensionEnabled(enabled)
    if (enabled) refreshGameTabs()
    else setExtensionStatus('拡張機能の連携はOFFです')
  }

  const handleTargetChange = (tabId) => {
    sessionStorage.setItem(EXPANSION_TARGET_KEY, tabId)
    setTargetTabId(tabId)
  }

  const handleExtensionEvent = useEffectEvent(async (message) => {
    if (!extensionMode || !extensionEnabled) return
    if (message.type === 'captured-id') {
      const sent = await submitId(message.code, { auto: true })
      setExtensionStatus(sent ? '救援IDを共有しました' : 'ID共有を確認してください（重複・未送信の可能性）')
    } else if (message.type === 'join-route-status') {
      const labels = {
        'id-filled': 'ID入力欄にセットしました（参加確定はゲーム画面で確認）',
        'supporter-route-reached': '指定タブがサポーター画面へ進みました',
        'quest-start-tapped': '開始ボタンを押しました。戦闘画面への遷移を確認してください',
        'battle-route-reached': '指定タブが戦闘画面へ進みました',
      }
      setExtensionStatus(labels[message.status] || 'ゲーム画面の状態を確認してください')
    } else if (message.type === 'diagnostic') {
      const reasons = {
        multiple_enabled_rooms: '連携ONのページが複数あります。使うページだけONにしてください',
        no_enabled_room: '連携ONのページが見つかりません',
        target_tab_busy: '指定タブが戦闘中などのためIDを入力できません',
        id_input_not_found: 'ゲームのID入力欄が見つかりません',
        target_tab_unavailable: '指定タブが見つかりません。タブ一覧を更新してください',
      }
      if (reasons[message.item?.reason]) setExtensionStatus(reasons[message.item.reason])
    }
  })

  useEffect(() => {
    if (!extensionMode) return undefined
    return onExtensionEvent(handleExtensionEvent)
  }, [extensionMode])

  // ペーストされた文字列で入力欄を置き換える（すべてのペーストの共通処理）
  const applyPastedText = (text) => {
    if (!text) return

    // 不正な文字や9文字以上を含む場合は、入力欄を一切変更しない
    if (!isAllowedInput(text)) {
      showNotice('貼り付けできるのは半角英数字8文字以内です')
      return
    }

    setInputId(text)
    tryAutoSubmit(text)
  }

  // クリップボードから貼り付け
  const pasteFromClipboard = async () => {
    let text

    try {
      text = await navigator.clipboard.readText()
    } catch (error) {
      console.log('クリップボードの読み取りに失敗しました')
      showNotice('クリップボードの読み取りに失敗しました')
      return
    }

    applyPastedText(text)
  }

  // 手入力
  const handleInputChange = (e) => {
    const value = e.target.value

    // 半角英数字8文字以内でなければ入力欄に反映しない
    if (!isAllowedInput(value)) return

    setInputId(value)

    if (value.length === ID_LENGTH) {
      tryAutoSubmit(value)
    }
  }

  // 個別削除
  const handleDelete = async (id) => {
    setIds((prevIds) =>
      prevIds.filter((item) => item.id !== id)
    )

    try {
      await remove(ref(database, `ids/${id}`))
    } catch (error) {
      console.log('Firebaseからの削除に失敗しました')
    }
  }

  // FirebaseとReactの履歴を全件削除
  const handleDeleteAll = async () => {
    try {
      await remove(ref(database, 'ids'))
      setIds([])
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.log('Firebaseの全件削除に失敗しました')
    }
  }

  // クリップボードへコピー
  const copyToClipboard = async (id, value) => {
    try {
      await navigator.clipboard.writeText(value)

      setIds((prevIds) =>
        prevIds.map((item) =>
          item.id === id
            ? { ...item, status: 'copied' }
            : item
        )
      )

      rememberId(value)
    } catch (error) {
      console.log('クリップボードへのコピーに失敗しました')
      showNotice('クリップボードへのコピーに失敗しました')
    }
  }

  // クリップボードへコピーして、自分の画面の履歴から削除（Firebaseは操作しない）
  const copyAndRemoveFromHistory = async (item) => {
    try {
      await navigator.clipboard.writeText(item.value)
    } catch {
      console.log('クリップボードへのコピーに失敗しました')
      showNotice('クリップボードへのコピーに失敗しました')
      return
    }

    // コピーに成功してから履歴削除と記憶の更新を行う
    setIds((prevIds) =>
      prevIds.filter((prevItem) => prevItem.id !== item.id)
    )

    rememberId(item.value)
  }

  // キーボードショートカット（Q・W・1～5）
  const handleShortcut = useEffectEvent((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.repeat || e.isComposing) return
    if (isTextEntryElement(e.target)) return

    const key = e.key.toLowerCase()

    // Q：通常のペースト処理を呼び出す
    if (key === 'q') {
      e.preventDefault()
      pasteFromClipboard()
      return
    }

    // W：赤・青のIDのうち最も古いものをコピーして削除（灰色はスキップ）
    if (key === 'w') {
      e.preventDefault()

      const oldestItem = idsRef.current.findLast(
        (item) => item.status !== 'copied'
      )

      if (oldestItem) {
        copyAndRemoveFromHistory(oldestItem)
      }
      return
    }

    // 1～5：上から数えた位置のIDをコピーして削除
    if (['1', '2', '3', '4', '5'].includes(key)) {
      e.preventDefault()

      const targetItem = idsRef.current[Number(key) - 1]

      if (targetItem) {
        copyAndRemoveFromHistory(targetItem)
      }
    }
  })

  useEffect(() => {
    const handleKeyDown = (e) => handleShortcut(e)

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="app">
      <div className="header-area">
        <div className="reset-area">
          <button
            className="reset-button"
            onClick={handleDeleteAll}
          >
            全件削除
          </button>

          <span className="reset-note">
            ※押してからページ閉じてね
          </span>
        </div>

        <h1>{extensionMode ? '拡張版 ID共有' : 'ID共有システム'}</h1>

        <div className="volume-area">
          <label htmlFor="volume">🔊 音量</label>

          <input
            id="volume"
            type="range"
            min="0"
            max="200"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />

          <input
            className="volume-number"
            type="number"
            min="0"
            max="200"
            value={volume}
            onChange={(e) => {
              const value = Number(e.target.value)

              if (value >= 0 && value <= 200) {
                setVolume(value)
              }
            }}
          />

          <span>%</span>
        </div>
      </div>

      {extensionMode && (
        <ExpansionControls
          enabled={extensionEnabled}
          onEnabledChange={handleEnabledChange}
          targetTabId={targetTabId}
          onTargetChange={handleTargetChange}
          gameTabs={gameTabs}
          onRefresh={refreshGameTabs}
          status={extensionStatus}
        />
      )}

      <div className="input-area">
        <input
          type="text"
          placeholder="IDを入力"
          autoComplete="off"
          spellCheck={false}
          value={inputId}
          onChange={handleInputChange}
          onPaste={(e) => {
            // ブラウザ標準の挿入はせず、共通のペースト処理で置き換える
            e.preventDefault()
            applyPastedText(e.clipboardData.getData('text'))
          }}
          onCompositionEnd={(e) => {
            // IMEで確定された不正な文字が残らないように元に戻す
            if (!isAllowedInput(e.currentTarget.value)) {
              e.currentTarget.value = inputId
            }
          }}
          onFocus={pasteFromClipboard}
          onMouseEnter={pasteFromClipboard}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              submitId(inputId)
            }
          }}
        />

        <button onClick={() => submitId(inputId)}>
          送信
        </button>
      </div>

      <div className="status-area">
        <div className="last-id">
          直前のID：
          <span className="last-id-value">
            {lastId || 'なし'}
          </span>
        </div>

        {notice && (
          <div className="notice" role="alert">
            {notice}
          </div>
        )}
      </div>

      <div className="id-list">
        {ids.map((item) => (
          <div className="id-item" key={item.id}>
            {item.status !== 'new' && (
              <button
                className="delete-button"
                onClick={() => handleDelete(item.id)}
              >
                削除
              </button>
            )}

            <button
              className={`id-button ${item.status}`}
              onClick={() => {
                if (item.status !== 'copied') {
                  copyToClipboard(item.id, item.value)
                }
              }}
            >
              {item.value}
            </button>

            <button
              className="copy-button"
              onClick={() =>
                copyToClipboard(item.id, item.value)
              }
            >
              コピー
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
