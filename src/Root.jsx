import { useEffect, useState } from 'react'
import App from './App.jsx'
import TopMenu from './TopMenu.jsx'
import SystemMenu from './system/screens/SystemMenu.jsx'
import CreateRoomScreen from './system/screens/CreateRoomScreen.jsx'
import JoinRoomScreen from './system/screens/JoinRoomScreen.jsx'
import RoomScreen from './system/screens/RoomScreen.jsx'
import RoomMessageScreen from './system/components/RoomMessageScreen.jsx'
import { createRoom, joinRoom, leaveRoom } from './system/lib/roomService.js'
import {
  saveRoomSession,
  loadRoomSession,
  clearRoomSession,
} from './system/lib/roomSession.js'
import './shared/Menu.css'

// 画面の切り替え
//
// URLのハッシュと画面の対応（再読み込みやブラウザの戻るボタンでも画面を保てる）
//   (なし)         トップ画面
//   #rescue        救援用（App.jsx）
//   #system        システム用メニュー
//   #system/create ルーム作成
//   #system/join   ルーム参加
//   #system/room   ルーム内
const ROUTES = {
  '#rescue': 'rescue',
  '#system': 'system',
  '#system/create': 'create',
  '#system/join': 'join',
  '#system/room': 'room',
}

const getScreen = () => ROUTES[window.location.hash] ?? 'top'

const navigate = (hash) => {
  window.location.hash = hash
}

function Root() {
  const [screen, setScreen] = useState(getScreen)
  // 参加中のルーム情報 { passphrase, nickname, participantId, isHost }
  const [roomSession, setRoomSession] = useState(loadRoomSession)

  useEffect(() => {
    const handleHashChange = () => {
      // ブラウザの戻る操作などでルーム画面を離れた場合は退室扱いにする
      if (getScreen() !== 'room') {
        const session = loadRoomSession()

        if (session) {
          leaveRoom(session).catch(() => {})
          clearRoomSession()
        }
      }

      setRoomSession(loadRoomSession())
      setScreen(getScreen())
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const enterRoom = (session) => {
    saveRoomSession(session)
    setRoomSession(session)
    navigate('#system/room')
  }

  const handleCreate = async ({ nickname, passphrase, capacity }) => {
    const participantId = await createRoom({ passphrase, capacity, nickname })
    enterRoom({ passphrase, nickname, participantId, isHost: true })
  }

  const handleJoin = async ({ nickname, passphrase }) => {
    const participantId = await joinRoom({ passphrase, nickname })
    enterRoom({ passphrase, nickname, participantId, isHost: false })
  }

  // 退室処理は呼び出し元で済ませ、ここでは画面だけ戻す
  const exitRoom = () => {
    clearRoomSession()
    setRoomSession(null)
    navigate('')
  }

  switch (screen) {
    case 'rescue':
      return (
        <>
          <div className="top-nav">
            <button onClick={() => navigate('')}>
              ← トップに戻る
            </button>
          </div>

          <App />
        </>
      )

    case 'system':
      return (
        <SystemMenu
          onCreate={() => navigate('#system/create')}
          onJoin={() => navigate('#system/join')}
          onBack={() => navigate('')}
        />
      )

    case 'create':
      return (
        <CreateRoomScreen
          onBack={() => navigate('#system')}
          onCreate={handleCreate}
        />
      )

    case 'join':
      return (
        <JoinRoomScreen
          onBack={() => navigate('#system')}
          onJoin={handleJoin}
        />
      )

    case 'room':
      // 退室後にブラウザの戻る操作で来た場合など、ルーム情報がないとき
      if (!roomSession) {
        return (
          <RoomMessageScreen
            message="ルームの情報がありません。"
            onBack={() => navigate('')}
          />
        )
      }

      return <RoomScreen session={roomSession} onExit={exitRoom} />

    default:
      return (
        <TopMenu
          onRescue={() => navigate('#rescue')}
          onSystem={() => navigate('#system')}
        />
      )
  }
}

export default Root
