import './ExpansionControls.css'

function ExpansionControls({ enabled, onEnabledChange, senderTabId, onSenderChange, targetTabId, onTargetChange, gameTabs, onRefresh, status }) {
  return (
    <section className="expansion-controls" aria-label="拡張機能の連携">
      <label className="expansion-toggle">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
        自動共有とID受信を有効にする
      </label>
      <div className="expansion-target">
        <label htmlFor="expansion-sender-tab">IDを送信するGBFタブ</label>
        <select id="expansion-sender-tab" value={senderTabId} onChange={(event) => onSenderChange(event.target.value)} disabled={!enabled}>
          <option value="">タブを選択してください</option>
          {gameTabs.map((tab) => (
            <option key={tab.tabId} value={tab.tabId}>
              {tab.title || 'GBF'} (タブ {tab.tabId})
            </option>
          ))}
        </select>
      </div>
      <div className="expansion-target">
        <label htmlFor="expansion-receiver-tab">IDを受信するGBFタブ</label>
        <select id="expansion-receiver-tab" value={targetTabId} onChange={(event) => onTargetChange(event.target.value)} disabled={!enabled}>
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
      <p className="expansion-note">送信元と受信先には同じタブも選べます。受信時は選択したタブでID入力画面を開き、「参加する」とサポーター画面の開始ボタンを押します。戦闘中のタブは移動しません。</p>
    </section>
  )
}

export default ExpansionControls
