import { useState } from 'react'
import { hunEum, wordsWith, type LevelData } from '../data'
import { Hj, SpeakBtn, TopBar } from '../components/ui'
import { Modal } from './Home'
import { statOf, useStore, MASTERED } from '../lib/store'
import { sfx, speak } from '../lib/sound'
import type { Go, Pool } from '../App'

export function SetScreen({ lv, index, go }: { lv: LevelData; index: number; go: Go }) {
  useStore()
  const set = lv.sets[index]
  const pool: Pool = { key: `set${index}`, title: set.name, chars: set.chars }
  const [detail, setDetail] = useState<string | null>(null)
  const h = detail ? lv.byChar.get(detail)! : null
  const modes = [
    { icon: '🃏', name: '낱말카드', desc: '카드를 뒤집어 봐요', color: 'blue', to: () => go({ name: 'cards', pool }) },
    { icon: '🧠', name: '배우기', desc: '문제를 풀며 익혀요', color: 'green', to: () => go({ name: 'learn', pool }) },
    { icon: '✍️', name: '필순', desc: '쓰는 순서를 배워요', color: 'orange', to: () => go({ name: 'stroke', pool }) },
    { icon: '🧩', name: '짝 맞추기', desc: '빨리 짝을 찾아요', color: 'purple', to: () => go({ name: 'match', pool }) },
  ]
  return (
    <div className="page">
      <TopBar title={<>{set.icon} {set.name}</>} onBack={() => go({ name: 'home' })} />
      <div className="mode-grid">
        {modes.map((m) => (
          <button key={m.name} className={`mode-card ${m.color}`} onClick={() => { sfx.tap(); m.to() }}>
            <span>{m.icon}</span><strong>{m.name}</strong><small>{m.desc}</small>
          </button>
        ))}
      </div>
      <h3 className="sec">이 묶음의 한자 {set.chars.length}자</h3>
      <div className="char-grid">
        {set.chars.map((c) => {
          const x = lv.byChar.get(c)!, box = statOf(c).box
          return (
            <button key={c} className="char-tile" onClick={() => { sfx.tap(); setDetail(c); speak(hunEum(x)) }}>
              <Hj>{c}</Hj><small>{hunEum(x)}</small>
              <i className={box >= MASTERED ? 'dot done' : box > 0 ? 'dot going' : 'dot'} />
            </button>
          )
        })}
      </div>
      {h && (
        <Modal title="한자 살펴보기" onClose={() => setDetail(null)}>
          <div className="detail">
            <Hj className="detail-char">{h.c}</Hj>
            <div>
              <div className="detail-he">{hunEum(h)} <SpeakBtn text={hunEum(h)} /></div>
              <p>쉬운 뜻: {h.easy}{h.alt ? ` · 또 다른 소리: ${h.alt}` : ''}</p>
              <p className="muted">{h.level}급 한자{lv.strokes[h.c] ? ` · ${lv.strokes[h.c].strokes.length}획` : ''}</p>
            </div>
          </div>
          <ul className="word-list">
            {wordsWith(lv, h.c).slice(0, 5).map((w) => <li key={w.w}><Hj>{w.w}</Hj><b>{w.r}</b><span>{w.m}</span></li>)}
          </ul>
        </Modal>
      )}
    </div>
  )
}
