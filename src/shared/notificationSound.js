// ポロン♪という通知音（救援用と同じ音）
// volume は 0～200（%）
export const playNotificationSound = (volume) => {
  try {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = 'sine'

    oscillator.frequency.setValueAtTime(660, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.12)

    gainNode.gain.setValueAtTime(volume / 100 * 0.2, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.5
    )

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.5)

    oscillator.onended = () => {
      audioContext.close()
    }
  } catch {
    console.log('通知音の再生に失敗しました')
  }
}
