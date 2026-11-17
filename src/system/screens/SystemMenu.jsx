import RoomMaintenance from '../components/RoomMaintenance.jsx'

// システム用メニュー（ルーム作成・参加の入口）
function SystemMenu({ onCreate, onJoin, onBack }) {
  return (
    <div className="menu-screen">
      <h1>システム用</h1>

      <div className="menu-buttons">
        <button className="menu-button primary" onClick={onCreate}>
          ルームを作る
        </button>

        <button className="menu-button primary" onClick={onJoin}>
          参加する
        </button>

        <button className="menu-button" onClick={onBack}>
          トップ画面に戻る
        </button>
      </div>

      <RoomMaintenance />
    </div>
  )
}

export default SystemMenu
