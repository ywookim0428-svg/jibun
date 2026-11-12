import { useRef, useState } from 'react'
import { hunEum, wordsWith, type LevelData } from '../data'
import { Done, Hj, Icon, Progress, SpeakBtn, TopBar } from '../components/ui'
import { shuffle } from '../lib/quiz'
import { sfx, speak } from '../lib/sound'
import { addStars } from '../lib/store'
import type { Go, Pool } from '../App'

export function Cards({ lv, pool, go }: { lv: LevelData; pool: Pool; go: Go }) {
  const [deck, setDeck] = useState(() => shuffle(pool.chars))
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [hanjaFront, setHanjaFront] = useState(true)
  const [unknown, setUnknown] = useState<string[]>([])
  const [dx, setDx] = useState(0)
  const [fly, setFly] = useState<'' | 'left' | 'right'>('')
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const back = () => go(pool.key.startsWith('set') ? { name: 'set', set: Number(pool.key.slice(3)) } : { name: 'home' })

  if (i >= deck.length) {
    const known = deck.length - unknown.length
    return (
      <Done title="카드를 다 봤어요" message={`알아요 ${known}장 · 다시 볼래요 ${unknown.length}장`} score={known} total={deck.length} actions={<>
        {unknown.length > 0 && <button className="btn" onClick={() => { setDeck(shuffle(unknown)); setUnknown([]); setI(0); setFlipped(false) }}>모르는 카드만 다시</button>}
        <button className="btn ghost" onClick={() => { setDeck(shuffle(pool.chars)); setUnknown([]); setI(0); setFlipped(false) }}>처음부터 다시</button>
        <button className="btn ghost" onClick={back}>그만하기</button>
      </>} />
    )
  }
  const h = lv.byChar.get(deck[i])!
  const flip = () => { sfx.flip(); if (!flipped === hanjaFront) speak(hunEum(h)); setFlipped(!flipped) }
  const next = (know: boolean) => {
    if (fly) return
    if (know) sfx.correct()
    else sfx.pop()
    setFly(know ? 'right' : 'left')
    setTimeout(() => {
      if (!know) setUnknown((u) => [...u, h.c])
      if (i + 1 >= deck.length) addStars(1)
      setI(i + 1); setFlipped(false); setFly(''); setDx(0)
    }, 260)
  }
  const hanjaSide = <><span className="face-label">한자</span><Hj className="card-hanja">{h.c}</Hj></>
  const infoSide = (
    <div className="card-info">
      <span className="face-label">뜻과 소리</span>
      <div className="card-he">{hunEum(h)}</div>
      <p>{h.easy}{h.alt ? ` · ${h.alt}` : ''}</p>
      <ul className="word-list compact">
        {wordsWith(lv, h.c).slice(0, 2).map((w) => <li key={w.w}><Hj>{w.w}</Hj><b>{w.r}</b></li>)}
      </ul>
    </div>
  )
  return (
    <div className="page run">
      <TopBar title={pool.title} onBack={back} right={<>
        <button className="select" onClick={() => { sfx.tap(); setHanjaFront(!hanjaFront); setFlipped(false) }}>{hanjaFront ? '앞면: 한자' : '앞면: 뜻과 소리'}</button>
        <SpeakBtn text={hunEum(h)} />
      </>} />
      <Progress value={i} max={deck.length} />
      <div className="card-stage">
        <div
          className={`flashcard ${flipped ? 'flipped' : ''} ${fly}`}
          style={{ transform: fly ? undefined : `translateX(${dx}px) rotate(${dx / 30}deg)` }}
          onPointerDown={(e) => { drag.current = { x: e.clientX, moved: false }; e.currentTarget.setPointerCapture(e.pointerId) }}
          onPointerMove={(e) => { if (!drag.current) return; const d = e.clientX - drag.current.x; if (Math.abs(d) > 8) drag.current.moved = true; setDx(d) }}
          onPointerUp={() => { const d = drag.current; drag.current = null; if (!d) return; if (!d.moved) flip(); else if (dx > 90) next(true); else if (dx < -90) next(false); setDx(0) }}
          onPointerCancel={() => { drag.current = null; setDx(0) }}
        >
          <div className="flash-inner">
            <div className="face front">{hanjaFront ? hanjaSide : infoSide}<small className="tap-hint">눌러서 뒤집기</small></div>
            <div className="face back">{hanjaFront ? infoSide : hanjaSide}</div>
          </div>
          {dx > 40 && <span className="stamp ok">알아요!</span>}
          {dx < -40 && <span className="stamp no">다시 볼래요</span>}
        </div>
      </div>
      <div className="card-actions">
        <button className="round no" aria-label="다시 볼래요" onClick={() => next(false)}><Icon name="close" size={30} /></button>
        <div className="card-count"><b>{i + 1} / {deck.length}</b><small>← 다시 볼래요 · 알아요 →</small></div>
        <button className="round ok" aria-label="알아요" onClick={() => next(true)}><Icon name="check" size={30} /></button>
      </div>
    </div>
  )
}
