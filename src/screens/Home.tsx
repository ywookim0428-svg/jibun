import { useState } from 'react'
import { LEVEL_LIST, type LevelData } from '../data'
import { Hj, Icon, Progress } from '../components/ui'
import { isDue, isMastered, resetAll, setState, statOf, useStore, STICKERS } from '../lib/store'
import { sfx } from '../lib/sound'
import type { Go } from '../App'

export function Home({ lv, go }: { lv: LevelData; go: Go }) {
  const st = useStore()
  const [modal, setModal] = useState<'level' | 'settings' | 'stickers' | null>(null)
  const [sure, setSure] = useState(false)
  const all = lv.chars.map((h) => h.c)
  const due = all.filter(isDue)
  const mastered = all.filter(isMastered).length
  const started = all.filter((c) => statOf(c).box > 0).length - mastered
  const nextSet = lv.sets.findIndex((s) => !s.chars.every(isMastered))
  const open = (m: typeof modal) => { sfx.tap(); setSure(false); setModal(m) }
  const nav = (r: Parameters<Go>[0]) => { sfx.tap(); go(r) }
  const cont = due.length
    ? { label: '오늘의 복습', title: `다시 볼 한자 ${due.length}자`, chars: due.slice(0, 6), to: () => nav({ name: 'learn', pool: { key: 'review', title: '오늘의 복습', chars: due } }) }
    : nextSet >= 0
      ? { label: mastered || started ? '이어서 하기' : '여기서 시작해요', title: lv.sets[nextSet].name, chars: lv.sets[nextSet].chars.slice(0, 6), to: () => nav({ name: 'set', set: nextSet }) }
      : { label: '모두 익혔어요', title: '모든 한자 섞어서 풀기', chars: all.slice(0, 6), to: () => nav({ name: 'learn', pool: { key: 'all', title: '모든 한자', chars: all } }) }
  return (
    <div className="page home">
      <nav className="navbar">
        <span className="brand"><Hj>漢</Hj>한자 카드</span>
        <button className="select" onClick={() => open('level')}>{lv.exam.name}<Icon name="chevron" size={18} /></button>
        <span className="grow" />
        <button className="stat-btn" onClick={() => open('stickers')}><span className="star"><Icon name="star" fill size={20} /></span>{st.stars}</button>
        <button className="icon-btn plain" aria-label="설정" onClick={() => open('settings')}><Icon name="gear" /></button>
      </nav>

      <section className="continue">
        <div className="continue-main">
          <small>{cont.label}</small>
          <h2>{cont.title}</h2>
          <Hj className="continue-chars">{cont.chars.join(' ')}</Hj>
          <button className="btn" onClick={cont.to}>학습 시작</button>
        </div>
        <div className="summary">
          <div className="summary-head"><b>{lv.exam.name} 진도</b><span>{mastered} / {all.length}자</span></div>
          <Progress value={mastered} max={all.length} />
          <ul>
            <li><i className="dot done" />익힘<b>{mastered}</b></li>
            <li><i className="dot going" />학습 중<b>{started}</b></li>
            <li><i className="dot" />아직<b>{all.length - mastered - started}</b></li>
          </ul>
        </div>
      </section>

      <div className="tools">
        <button className="tool" onClick={() => nav({ name: 'learn', pool: { key: 'all', title: '섞어서 풀기', chars: all } })}><Icon name="shuffle" /><span><b>섞어서 풀기</b><small>모든 한자에서 10문제</small></span></button>
        <button className="tool" onClick={() => nav({ name: 'exam' })}><Icon name="test" /><span><b>모의시험</b><small>진짜 시험처럼 풀기</small></span></button>
        <button className="tool" onClick={() => open('stickers')}><Icon name="book" /><span><b>스티커북</b><small>{new Set(st.stickers).size} / {STICKERS.length}장</small></span></button>
      </div>

      <h3 className="sec">학습 세트 <span>{lv.sets.length}개</span></h3>
      <div className="set-grid">
        {lv.sets.map((s, i) => {
          const m = s.chars.filter(isMastered).length
          const doneAll = m === s.chars.length
          return (
            <button key={i} className="set-card" onClick={() => nav({ name: 'set', set: i })}>
              <div className="set-top"><strong>{s.name}</strong>{doneAll && <span className="badge ok"><Icon name="check" size={14} />완료</span>}</div>
              <span className="badge">한자 {s.chars.length}자</span>
              <Hj className="set-preview">{s.chars.slice(0, 6).join(' ')}</Hj>
              <div className="set-foot"><Progress value={m} max={s.chars.length} /><small>{m}/{s.chars.length}</small></div>
            </button>
          )
        })}
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
        <Modal title="스티커북" onClose={() => setModal(null)}>
          <p className="muted">한 판을 끝낼 때마다 스티커를 한 장 받아요. 지금까지 모은 별은 {st.stars}개예요.</p>
          <div className="sticker-grid">
            {STICKERS.map((s) => <span key={s} className={st.stickers.includes(s) ? 'got' : ''}>{st.stickers.includes(s) ? s : '?'}</span>)}
          </div>
        </Modal>
      )}
      {modal === 'settings' && (
        <Modal title="설정" onClose={() => setModal(null)}>
          <label className="toggle"><span>효과음</span><input id="set-sound" type="checkbox" checked={st.sound} onChange={(e) => { setState({ sound: e.target.checked }); sfx.tap() }} /></label>
          <label className="toggle"><span>읽어 주기</span><input id="set-voice" type="checkbox" checked={st.voice} onChange={(e) => setState({ voice: e.target.checked })} /></label>
          <button className="btn ghost danger" onClick={() => { if (sure) { resetAll(); setSure(false); setModal(null) } else setSure(true) }}>{sure ? '정말 지울까요? 한 번 더 누르면 지워져요' : '학습 기록 지우기'}</button>
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
        <div className="modal-head"><h2>{title}</h2><button className="icon-btn plain" aria-label="닫기" onClick={() => { sfx.tap(); onClose() }}><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  )
}
