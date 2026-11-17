// トップ画面（救援用／システム用を選ぶ）
function TopMenu({ onRescue, onSystem }) {
  return (
    <div className="menu-screen">
      <h1>ID共有システム</h1>

      <div className="menu-buttons">
        <button className="menu-button primary" onClick={onRescue}>
          救援用
        </button>

        <button className="menu-button primary" onClick={onSystem}>
          システム用
        </button>
      </div>
    </div>
  )
}

export default TopMenu
