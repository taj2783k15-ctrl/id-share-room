// ルーム画面の代わりに表示するメッセージ画面
// （接続中・解散された・キックされた・ルーム情報がない など）
// onBack を渡すと「トップ画面に戻る」ボタンを表示する
function RoomMessageScreen({ message, onBack }) {
  return (
    <div className="menu-screen">
      <h1>ルーム</h1>
      <p>{message}</p>

      {onBack && (
        <div className="menu-buttons">
          <button className="menu-button" onClick={onBack}>
            トップ画面に戻る
          </button>
        </div>
      )}
    </div>
  )
}

export default RoomMessageScreen
