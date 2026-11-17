import { HISTORY_SIZE } from '../lib/history.js'

// 参加者1人分の列
// IDは上が最新、下がひとつ前。クリックでコピー（コピー済みは灰色。灰色でもコピーできる）
//
// entries  : その参加者のID履歴（新しい順）
// onCopy   : IDをクリックしたとき onCopy(entry)
// onKick   : ホストの画面だけ渡す（渡されたらキックボタンを表示）
function ParticipantColumn({
  heading,
  nickname,
  isSelf,
  isHostMember,
  entries,
  onCopy,
  onKick,
}) {
  const slots = Array.from({ length: HISTORY_SIZE }, (_, index) => index)

  return (
    <div className={`room-column ${isSelf ? 'self' : ''}`}>
      <div className="column-heading">{heading}</div>

      <div className="column-nickname">
        {nickname}
        {isHostMember && <span className="host-mark">ホスト</span>}
      </div>

      <div className="column-ids">
        {slots.map((index) => {
          const entry = entries[index]

          return entry ? (
            <button
              key={index}
              className={`room-id-button ${entry.status}`}
              onClick={() => onCopy(entry)}
            >
              {entry.value}
            </button>
          ) : (
            <span key={index} className="room-id-empty">未送信</span>
          )
        })}
      </div>

      {onKick && (
        <button className="kick-button" onClick={onKick}>
          キック
        </button>
      )}
    </div>
  )
}

// 誰も参加していない枠
export function EmptyColumn({ heading }) {
  return (
    <div className="room-column">
      <div className="column-heading">{heading}</div>
      <div className="column-empty">空き</div>
    </div>
  )
}

export default ParticipantColumn
