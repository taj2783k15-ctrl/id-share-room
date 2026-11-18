import './ExpansionControls.css'

function tabLabel(tab, windowNumbers) {
  const windowLabel = windowNumbers.size > 1 && Number.isInteger(tab.windowId)
    ? `窓${windowNumbers.get(tab.windowId)}・` : ''
  const position = Number.isInteger(tab.index) ? `左から${tab.index + 1}番目` : `タブ ${tab.tabId}`
  return `${windowLabel}${position} — ${tab.title || 'GBF'} ${tab.hash || ''}`
}

function ExpansionControls({ enabled, onEnabledChange, senderTabId, onSenderChange, receiverTabIds, onReceiverChange, onReceiverAdd, onReceiverRemove, gameTabs, onRefresh, status }) {
  const windowNumbers = new Map([...new Set(gameTabs.map((tab) => tab.windowId).filter(Number.isInteger))]
    .map((windowId, index) => [windowId, index + 1]))

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
              {tabLabel(tab, windowNumbers)}
            </option>
          ))}
        </select>
      </div>
      {receiverTabIds.map((tabId, index) => (
        <div className="expansion-target" key={index}>
          <label htmlFor={`expansion-receiver-tab-${index}`}>受信{index + 1}のGBFタブ</label>
          <select
            id={`expansion-receiver-tab-${index}`}
            value={tabId}
            onChange={(event) => onReceiverChange(index, event.target.value)}
            disabled={!enabled}
          >
            <option value="">タブを選択してください</option>
            {gameTabs.map((tab) => (
              <option
                key={tab.tabId}
                value={tab.tabId}
                disabled={receiverTabIds.some((selected, otherIndex) =>
                  otherIndex !== index && selected === String(tab.tabId))}
              >
                {tabLabel(tab, windowNumbers)}
              </option>
            ))}
          </select>
          {receiverTabIds.length > 1 && (
            <button type="button" onClick={() => onReceiverRemove(index)} disabled={!enabled}>削除</button>
          )}
        </div>
      ))}
      <div className="expansion-target">
        {receiverTabIds.length < 3 && (
          <button type="button" onClick={onReceiverAdd} disabled={!enabled}>受信タブを追加</button>
        )}
        <button type="button" onClick={onRefresh} disabled={!enabled}>タブを更新</button>
      </div>
      <p className="expansion-status" role="status">{status}</p>
      <p className="expansion-note">受信IDは登録したタブを上から順に使い、最後の次は最初へ戻ります。送信元と受信先には同じタブも選べます。受信時はID入力画面を開き、「参加する」とサポーター画面の開始ボタンを押します。戦闘中のタブは移動しません。</p>
    </section>
  )
}

export default ExpansionControls
