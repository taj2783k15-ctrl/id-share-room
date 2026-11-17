import VolumeControl from './VolumeControl.jsx'

// ルーム内画面の上部（合言葉・参加人数・自分の立場・音量）
function RoomHeader({
  passphrase,
  participantCount,
  capacity,
  amHost,
  volume,
  onVolumeChange,
}) {
  return (
    <div className="room-header">
      <h1>ルーム</h1>

      <div className="room-info">
        <span>合言葉：<strong>{passphrase}</strong></span>
        <span>
          参加：{participantCount}／{capacity}人
        </span>
        <span className="role-badge">
          {amHost ? 'ホスト' : '参加者'}
        </span>
      </div>

      <VolumeControl
        id="room-volume"
        className="room-volume"
        volume={volume}
        onChange={onVolumeChange}
      />
    </div>
  )
}

export default RoomHeader
