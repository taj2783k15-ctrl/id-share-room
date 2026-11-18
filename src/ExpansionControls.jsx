import './ExpansionControls.css'

function ExpansionControls({ enabled, onEnabledChange, targetTabId, onTargetChange, gameTabs, onRefresh, status }) {
  return (
    <section className="expansion-controls" aria-label="拡張機能の連携">
      <label className="expansion-toggle">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
        自動共有とID受信を有効にする
      </label>
      <div className="expansion-target">
        <label htmlFor="expansion-game-tab">IDを入力するGBFタブ</label>
        <select id="expansion-game-tab" value={targetTabId} onChange={(event) => onTargetChange(event.target.value)} disabled={!enabled}>
          <option value="">タブを選択してください</option>
          {gameTabs.map((tab) => (
            <option key={tab.tabId} value={tab.tabId}>
              {tab.title || 'GBF'} (タブ {tab.tabId})
            </option>
          ))}
        </select>
        <button type="button" onClick={onRefresh} disabled={!enabled}>タブを更新</button>
      </div>
      <p className="expansion-status" role="status">{status}</p>
      <p className="expansion-note">受信IDは選択したタブへ送ります。入力後にサポーター画面へ進むと開始ボタンを押します。ID入力画面の参加確定はゲーム画面で確認してください。</p>
    </section>
  )
}

export default ExpansionControls
