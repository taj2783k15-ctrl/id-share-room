// 通知音の音量（0～200%）
// 見た目は救援用と同じ .volume-area（App.css）を使う
function VolumeControl({ id, className = '', volume, onChange }) {
  return (
    <div className={`volume-area ${className}`}>
      <label htmlFor={id}>🔊 音量</label>

      <input
        id={id}
        type="range"
        min="0"
        max="200"
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <input
        className="volume-number"
        type="number"
        min="0"
        max="200"
        value={volume}
        onChange={(e) => {
          const value = Number(e.target.value)

          if (value >= 0 && value <= 200) {
            onChange(value)
          }
        }}
      />

      <span>%</span>
    </div>
  )
}

export default VolumeControl
