import { useEffect, useRef, useState } from 'react'
import type { LevelData } from '../data'
import { Burst, Done, Icon, Mascot, Progress, QuestionView, TopBar } from '../components/ui'
import { buildRound, type Question } from '../lib/quiz'
import { sfx, speak } from '../lib/sound'
import { addStars, awardSticker, grade } from '../lib/store'
import type { Go, Pool } from '../App'

const PRAISE = ['참 잘했어요!', '딩동댕!', '대단해요!', '멋져요!', '바로 그거예요!']
const CHEER = ['괜찮아, 다시 하면 돼!', '아깝다! 한 번 더 볼까?', '틀려도 괜찮아, 같이 외우자']

/** 문제를 풀며 익히기. 틀린 문제는 뒤에 한 번 더 나와요. */
export function Learn({ lv, pool, go, make }: { lv: LevelData; pool: Pool; go: Go; make?: () => Question[] }) {
  const build = () => (make ? make() : buildRound(lv, pool.chars))
  const [queue, setQueue] = useState(build)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [firstTry, setFirstTry] = useState(0)
  const [total, setTotal] = useState(queue.length)
  const [sticker, setSticker] = useState('')
  const [streak, setStreak] = useState(0)
  const retried = useRef(new Set<Question>())
  const timer = useRef(0)
  const back = () => go(pool.key.startsWith('set') ? { name: 'set', set: Number(pool.key.slice(3)) } : { name: 'home' })
  useEffect(() => () => clearTimeout(timer.current), [])

  const restart = () => { const q = build(); retried.current.clear(); setQueue(q); setTotal(q.length); setI(0); setPicked(null); setFirstTry(0); setSticker(''); setStreak(0) }
  if (i >= queue.length) {
    return (
      <Done title="한 판을 끝냈어요" message={`${total}문제 중에 ${firstTry}문제를 한 번에 맞혔어요`} score={firstTry} total={total} stars={firstTry} sticker={sticker} actions={<>
        <button className="btn" onClick={restart}>한 판 더!</button>
        <button className="btn ghost" onClick={back}>그만하기</button>
      </>} />
    )
  }
  const q = queue[i]
  const right = picked === q.answer
  const next = () => {
    clearTimeout(timer.current)
    if (i + 1 >= queue.length) { addStars(firstTry); setSticker(awardSticker()) }
    setPicked(null); setI(i + 1)
  }
  const pick = (n: number) => {
    if (picked !== null) return
    setPicked(n)
    const ok = n === q.answer
    const again = retried.current.has(q)
    if (!again) grade(q.chars, ok)
    if (ok) { sfx.correct(); if (streak + 1 >= 3) setTimeout(() => sfx.sticker(), 250); setStreak(streak + 1); if (!again) setFirstTry((v) => v + 1); timer.current = window.setTimeout(next, 1600) }
    else { sfx.wrong(); setStreak(0); if (!again) { retried.current.add(q); setQueue((qs) => [...qs, q]) } }
    if (q.say) setTimeout(() => speak(q.say!), 350)
  }
  return (
    <div className="page run">
      <TopBar title={pool.title} onBack={back} sub={`${Math.min(i + 1, queue.length)} / ${queue.length}`} right={<span className="stat-btn"><span className="star"><Icon name="star" fill size={20} /></span>{firstTry}</span>} />
      <Progress value={i} max={queue.length} />
      <QuestionView key={i} q={q} lvStrokes={lv.strokes} picked={picked} reveal={picked !== null} onPick={pick} />
      <div className={`feedback ${picked === null ? 'idle' : right ? 'ok' : 'no'}`}>
        {picked !== null && <>
          <span className="fb-mascot"><Mascot mood={right ? 'cheer' : 'oops'} size={68} className={right ? 'jump' : 'tilt'} />{right && <Burst />}</span>
          <div><strong>{right ? PRAISE[i % PRAISE.length] : CHEER[i % CHEER.length]}{right && streak >= 2 && <em className="streak">{streak}번 연속 정답!</em>}</strong><span>{q.explain}</span></div>
          <button className="btn" onClick={() => { sfx.tap(); next() }}>다음</button>
        </>}
      </div>
    </div>
  )
}
