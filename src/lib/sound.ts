// 효과음: 파일 없이 Web Audio로 직접 만들어요. iPad는 첫 터치 이후에만 소리가 나요.
import { getState } from './store'

let ctx: AudioContext | null = null
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}
/** 첫 터치에서 오디오 잠금 해제 */
export function unlockAudio() {
  const unlock = () => { ac() }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('touchend', unlock, { passive: true })
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, slideTo?: number) {
  const a = ac()
  if (!a || !getState().sound) return
  const t = a.currentTime + start
  const o = a.createOscillator(), g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  tap: () => tone(660, 0, 0.07, 'triangle', 0.12),
  flip: () => tone(300, 0, 0.13, 'triangle', 0.14, 620),
  correct: () => { tone(784, 0, 0.14, 'sine', 0.22); tone(1175, 0.1, 0.28, 'sine', 0.22) },
  wrong: () => { tone(260, 0, 0.16, 'square', 0.07, 200); tone(196, 0.14, 0.26, 'square', 0.07, 150) },
  pop: () => tone(520, 0, 0.1, 'sine', 0.2, 1040),
  stroke: () => tone(880, 0, 0.06, 'triangle', 0.12),
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.13, i === 5 ? 0.6 : 0.16, 'triangle', 0.2)),
  sticker: () => [988, 1319, 1568].forEach((f, i) => tone(f, i * 0.09, 0.25, 'sine', 0.18)),
}

/** 한국어 음성으로 읽어 주기 */
export function speak(text: string) {
  if (!getState().voice || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  // 괄호 속 두음법칙 소리는 빼고, '/'는 쉼으로 읽어요
  const u = new SpeechSynthesisUtterance(text.replace(/\([^)]*\)/g, '').replace(/\//g, ', '))
  u.lang = 'ko-KR'
  u.rate = 0.85
  speechSynthesis.speak(u)
}
