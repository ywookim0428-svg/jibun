import { useState } from 'react'
import { LEVEL_LIST, type LevelData } from '../data'
import { Hj, Progress } from '../components/ui'
import { isDue, isMastered, resetAll, setState, useStore, STICKERS } from '../lib/store'
import { sfx } from '../lib/sound'
import type { Go } from '../App'

export function Home({ lv, go }: { lv: LevelData; go: Go }) {
  const st = useStore()
  const [modal, setModal] = useState<'level' | 'settings' | 'stickers' | null>(null)
  const all = lv.chars.map((h) => h.c)
  const due = all.filter(isDue)
  const mastered = all.filter(isMastered).length
  const nextSet = lv.sets.findIndex((s) => !s.chars.every(isMastered))
  const open = (m: typeof modal) => { sfx.tap(); setModal(m) }
  return (
    <div className="page home">
      <header className="home-head">
        <div className="mascot">🐯</div>
        <div className="home-hello">
          <strong>안녕! 오늘도 한자 놀이 하자</strong>
          <button className="pill" onClick={() => open('level')}>{lv.exam.name} 공부 중 ▾</button>
        </div>
        <button className="chip" onClick={() => open('stickers')}>⭐ {st.stars}</button>
        <button className="chip" onClick={() => open('stickers')}>🎒 {new Set(st.stickers).size}</button>
        <button className="icon-btn" aria-label="설정" onClick={() => open('settings')}>⚙️</button>
      </header>

      <section className="hero">
        <div>
          <h2>{due.length ? `다시 볼 한자가 ${due.length}자 있어요` : nextSet >= 0 ? `${lv.sets[nextSet].icon} ${lv.sets[nextSet].name}` : '모든 한자를 익혔어요! 🎉'}</h2>
          <p>익힌 한자 {mastered} / {all.length}</p>
          <Progress value={mastered} max={all.length} />
        </div>
        {due.length
          ? <button className="btn yellow" onClick={() => go({ name: 'learn', pool: { key: 'review', title: '오늘의 복습', chars: due } })}>복습 시작 ▶</button>
          : <button className="btn yellow" onClick={() => go(nextSet >= 0 ? { name: 'set', set: nextSet } : { name: 'learn', pool: { key: 'all', title: '모든 한자', chars: all } })}>시작 ▶</button>}
      </section>

      <h3 className="sec">한자 묶음</h3>
      <div className="set-grid">
        {lv.sets.map((s, i) => {
          const m = s.chars.filter(isMastered).length
          return (
            <button key={i} className="set-card" onClick={() => { sfx.tap(); go({ name: 'set', set: i }) }}>
              <span className="set-icon">{s.icon}</span>
              <strong>{s.name}</strong>
              <Hj className="set-preview">{s.chars.slice(0, 5).join(' ')}</Hj>
              <Progress value={m} max={s.chars.length} />
              <small>{m === s.chars.length ? '다 익혔어요 ✓' : `${m} / ${s.chars.length}`}</small>
            </button>
          )
        })}
      </div>

      <h3 className="sec">더 해 보기</h3>
      <div className="more-grid">
        <button className="more-card" onClick={() => { sfx.tap(); go({ name: 'learn', pool: { key: 'all', title: '모든 한자 섞어서', chars: all } }) }}><span>🎲</span><strong>섞어서 배우기</strong><small>모든 한자에서 10문제</small></button>
        <button className="more-card" onClick={() => { sfx.tap(); go({ name: 'exam' }) }}><span>📝</span><strong>모의시험</strong><small>진짜 시험처럼 풀어요</small></button>
        <button className="more-card" onClick={() => open('stickers')}><span>🎒</span><strong>스티커북</strong><small>{new Set(st.stickers).size} / {STICKERS.length}장 모았어요</small></button>
      </div>

      {modal === 'level' && (
        <Modal title="급수 고르기" onClose={() => setModal(null)}>
          <div className="level-list">
            {LEVEL_LIST.map((l) => (
              <button key={l.id} className={`level-item ${l.id === lv.id ? 'on' : ''}`} disabled={!l.ready} onClick={() => { sfx.tap(); setState({ level: l.id }); setModal(null) }}>
                <strong>{l.name}</strong><small>{l.ready ? (l.id === lv.id ? '공부 중' : '바꾸기') : '준비 중'}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'stickers' && (
        <Modal title={`스티커북 · ⭐ ${st.stars}`} onClose={() => setModal(null)}>
          <p className="muted">한 판을 끝낼 때마다 스티커를 한 장 받아요.</p>
          <div className="sticker-grid">
            {STICKERS.map((s) => <span key={s} className={st.stickers.includes(s) ? 'got' : ''}>{st.stickers.includes(s) ? s : '?'}</span>)}
          </div>
        </Modal>
      )}
      {modal === 'settings' && (
        <Modal title="설정" onClose={() => setModal(null)}>
          <label className="toggle"><span>🔔 효과음</span><input type="checkbox" checked={st.sound} onChange={(e) => { setState({ sound: e.target.checked }); sfx.tap() }} /></label>
          <label className="toggle"><span>🔊 읽어 주기</span><input type="checkbox" checked={st.voice} onChange={(e) => setState({ voice: e.target.checked })} /></label>
          <button className="btn ghost danger" onClick={() => { if (confirm('학습 기록과 스티커를 모두 지울까요?')) { resetAll(); setModal(null) } }}>학습 기록 지우기</button>
          <p className="muted small">{lv.exam.org} {lv.exam.name} 기준 · 한자 {lv.chars.length}자 · 한자어 {lv.words.length}개<br />획순 데이터: Make Me a Hanzi (Arphic Public License) · 글꼴: Noto Serif KR (SIL OFL)</p>
        </Modal>
      )}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="icon-btn" aria-label="닫기" onClick={() => { sfx.tap(); onClose() }}>✕</button></div>
        {children}
      </div>
    </div>
  )
}
