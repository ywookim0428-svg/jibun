import { useState } from 'react'
import { hunEum, wordsWith, type LevelData } from '../data'
import { Hj, Icon, SpeakBtn, TopBar } from '../components/ui'
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
    { icon: 'cards', name: '낱말카드', to: () => go({ name: 'cards', pool }) },
    { icon: 'pen', name: '필순', to: () => go({ name: 'stroke', pool }) },
    { icon: 'match', name: '카드 맞추기', to: () => go({ name: 'match', pool }) },
    { icon: 'test', name: '모의시험', to: () => go({ name: 'exam' }) },
  ]
  const mastered = set.chars.filter((c) => statOf(c).box >= MASTERED).length
  return (
    <div className="page">
      <TopBar title={<>{set.icon} {set.name}</>} sub={`한자 ${set.chars.length}자 · 익힘 ${mastered}자`} onBack={() => go({ name: 'home' })} />
      <div className="mode-row">
        <button className="mode primary" onClick={() => { sfx.tap(); go({ name: 'learn', pool }) }}><Icon name="learn" size={28} /><span><b>학습하기</b><small>문제를 풀며 익혀요</small></span></button>
        {modes.map((m) => (
          <button key={m.name} className="mode" onClick={() => { sfx.tap(); m.to() }}><Icon name={m.icon} size={26} /><b>{m.name}</b></button>
        ))}
      </div>
      <h3 className="sec">이 세트의 한자 <span>{set.chars.length}자</span></h3>
      <ul className="term-list">
        {set.chars.map((c) => {
          const x = lv.byChar.get(c)!, box = statOf(c).box
          return (
            <li key={c}>
              <button className="term" onClick={() => { sfx.tap(); setDetail(c); speak(hunEum(x)) }}>
                <Hj className="term-char">{c}</Hj>
                <span className="term-he">{hunEum(x)}</span>
                <span className="term-easy">{x.easy}</span>
                <span className={`badge ${box >= MASTERED ? 'ok' : box > 0 ? 'going' : ''}`}>{box >= MASTERED ? '익힘' : box > 0 ? '학습 중' : '아직'}</span>
              </button>
              <SpeakBtn text={hunEum(x)} />
            </li>
          )
        })}
      </ul>
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
