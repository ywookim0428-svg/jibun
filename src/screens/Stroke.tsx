import { useState } from 'react'
import { hunEum, type LevelData } from '../data'
import { Hj, Icon, Mascot, SpeakBtn, TopBar, Writer } from '../components/ui'
import { qStroke, shuffle, type Question } from '../lib/quiz'
import { sfx } from '../lib/sound'
import { addStars } from '../lib/store'
import { Learn } from './Learn'
import type { Go, Pool } from '../App'

export function Stroke({ lv, pool, go }: { lv: LevelData; pool: Pool; go: Go }) {
  const chars = pool.chars.filter((c) => lv.strokes[c])
  const missing = pool.chars.filter((c) => !lv.strokes[c])
  const [c, setC] = useState(chars[0])
  const [mode, setMode] = useState<'animate' | 'quiz'>('animate')
  const [runKey, setRunKey] = useState(0)
  const [msg, setMsg] = useState('')
  const [quiz, setQuiz] = useState(false)
  const back = () => go(pool.key.startsWith('set') ? { name: 'set', set: Number(pool.key.slice(3)) } : { name: 'home' })
  const quizChars = chars.filter((x) => lv.strokeQuiz.has(x) && lv.strokes[x].strokes.length >= 3)

  if (quiz) {
    const make = () => shuffle(quizChars).slice(0, 8).map((x) => qStroke(lv, x)).filter((q): q is Question => !!q)
    return <Learn lv={lv} pool={{ ...pool, title: '필순 퀴즈' }} go={(r) => (r.name === 'set' || r.name === 'home' ? setQuiz(false) : go(r))} make={make} />
  }
  if (!chars.length) return <div className="page"><TopBar title="필순" onBack={back} /><p className="count">이 묶음은 필순 그림을 준비하고 있어요.</p></div>
  const h = lv.byChar.get(c)!
  const data = lv.strokes[c]
  const size = Math.round(Math.min(440, window.innerWidth - 64, window.innerHeight - 490))
  const choose = (x: string) => { sfx.tap(); setC(x); setMsg(''); setRunKey((k) => k + 1) }
  const setM = (m: typeof mode) => { sfx.tap(); setMode(m); setMsg(''); setRunKey((k) => k + 1) }
  const idx = chars.indexOf(c)
  return (
    <div className="page run">
      <TopBar title="필순" sub="쓰는 순서를 배워요" onBack={back} right={quizChars.length > 0 && <button className="btn small" onClick={() => { sfx.tap(); setQuiz(true) }}>필순 퀴즈</button>} />
      <div className="strip">
        {chars.map((x) => <button key={x} className={x === c ? 'on' : ''} onClick={() => choose(x)}><Hj>{x}</Hj></button>)}
      </div>
      <div className="stroke-head">
        <strong>{hunEum(h)}</strong><SpeakBtn text={hunEum(h)} /><span className="muted">{data.strokes.length}획</span>
      </div>
      <div className="tabs">
        <button className={mode === 'animate' ? 'on' : ''} onClick={() => setM('animate')}><Icon name="eye" size={20} />보기</button>
        <button className={mode === 'quiz' ? 'on' : ''} onClick={() => setM('quiz')}><Icon name="pen" size={20} />따라 쓰기</button>
      </div>
      <div className="writer-box">
        <Writer char={c} data={data} mode={mode} size={size} runKey={runKey} onDone={(miss) => {
          if (mode !== 'quiz') return
          sfx.fanfare(); addStars(1)
          setMsg(miss === 0 ? '한 번도 안 틀렸어요!' : '다 썼어요! 잘했어요')
        }} />
      </div>
      <p className="count stroke-msg">{msg && <Mascot mood="cheer" size={44} className="jump" />}{msg || (mode === 'quiz' ? '손가락이나 펜으로 순서대로 써 보세요' : '쓰는 순서를 잘 보세요')}</p>
      <div className="card-actions">
        <button className="btn ghost" disabled={idx === 0} onClick={() => choose(chars[idx - 1])}>앞 글자</button>
        <button className="btn ghost" onClick={() => { sfx.tap(); setMsg(''); setRunKey((k) => k + 1) }}><Icon name="redo" size={20} />다시</button>
        <button className="btn" disabled={idx === chars.length - 1} onClick={() => choose(chars[idx + 1])}>다음 글자</button>
      </div>
      {missing.length > 0 && <p className="muted small center"><Hj>{missing.join(' ')}</Hj> 은(는) 필순 그림을 준비하고 있어요.</p>}
    </div>
  )
}
