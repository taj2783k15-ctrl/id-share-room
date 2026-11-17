import { useEffect, useState } from 'react'
import { watchRoomCount, deleteAllRooms } from '../lib/roomService.js'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import '../styles/Form.css'

// 現在のルーム数とルーム全削除（Firebaseにデータを残さないための掃除用）
function RoomMaintenance() {
  // null は取得中
  const [roomCount, setRoomCount] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => watchRoomCount(setRoomCount), [])

  const handleDeleteAllRooms = () => {
    setDialog({
      message:
        'すべてのルームを削除しますか？使用中のルームも解散され、参加者は全員退室します。',
      confirmLabel: 'ルーム全削除',
      onConfirm: async () => {
        setDialog(null)

        try {
          const count = await deleteAllRooms()
          setMessage(
            count > 0 ? `${count}件のルームを削除しました` : '削除するルームはありません'
          )
        } catch {
          setMessage('ルームの削除に失敗しました')
        }
      },
    })
  }

  return (
    <div className="maintenance">
      <p className="maintenance-count">
        現在のルーム数：{roomCount === null ? '取得中…' : `${roomCount}件`}
      </p>

      <button
        className="menu-button danger"
        onClick={handleDeleteAllRooms}
        disabled={!roomCount}
      >
        ルーム全削除
      </button>

      {message && <p className="maintenance-message">{message}</p>}

      {dialog && (
        <ConfirmDialog
          dialog={dialog}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}

export default RoomMaintenance
