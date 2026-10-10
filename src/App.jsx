
import { useEffect, useState } from 'react'
import {
  ref,
  push,
  onChildAdded,
  remove,
} from 'firebase/database'
import { database } from './firebase'
import './App.css'

const STORAGE_KEY = 'id-share-room-ids'
const CLIENT_KEY = 'id-share-room-client-id'

function App() {
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

  // Reactの履歴が変わったらsessionStorageにも保存
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }, [ids])

  // ポロン♪という通知音
  const playNotificationSound = () => {
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
  }

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
  }, [clientId, volume])

  // クリップボードから貼り付け
  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()

      if (text) {
        setInputId(text.slice(0, 8))
      }
    } catch (error) {
      console.log('クリップボードの読み取りに失敗しました')
    }
  }

  // IDを追加する
  const handleSubmit = async () => {
    const newId = inputId.trim().slice(0, 8)

    if (!newId) return

    try {
      await push(ref(database, 'ids'), {
        value: newId,
        createdAt: Date.now(),
        sender: clientId,
      })

      setInputId('')
    } catch (error) {
      console.log('Firebaseへの送信に失敗しました')
    }
  }

  // 送信ボタンにカーソルをかざしたとき
  const handleSubmitHover = () => {
    const newId = inputId.trim()

    if (!newId) return

    const isDuplicate = ids.some(
      (item) => item.value === newId
    )

    if (!isDuplicate) {
      handleSubmit()
    }
  }

  // 送信ボタンをクリックしたとき
  const handleSubmitClick = () => {
    const newId = inputId.trim()

    if (!newId) return

    const isDuplicate = ids.some(
      (item) => item.value === newId
    )

    if (isDuplicate) {
      handleSubmit()
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
    } catch (error) {
      console.log('クリップボードへのコピーに失敗しました')
    }
  }

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

        <h1>ID共有システム</h1>

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

      <div className="input-area">
        <input
          type="text"
          placeholder="IDを入力"
          maxLength={8}
          value={inputId}
          onChange={(e) => setInputId(e.target.value.slice(0, 8))}
          onFocus={pasteFromClipboard}
          onMouseEnter={pasteFromClipboard}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit()
            }
          }}
        />

        <button
          onMouseEnter={handleSubmitHover}
          onClick={handleSubmitClick}
        >
          送信
        </button>
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
              onMouseEnter={() => {
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
