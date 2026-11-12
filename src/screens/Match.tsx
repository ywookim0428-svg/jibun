import { useEffect, useMemo, useState } from 'react'
import { hunEum, type LevelData } from '../data'
import { Done, Hj, TopBar } from '../components/ui'
import { shuffle } from '../lib/quiz'
import { sfx } from '../lib/sound'
import { addStars, awardSticker, getState, setState } from '../lib/store'
import type { Go, Pool } from '../App'

interface Tile { id: string; c: string; hanja: boolean }

export function Match({ lv, pool, go }: { lv: LevelData; pool: Pool; go: Go }) {
  const [round, setRound] = useState(0)
  const tiles = useMemo<Tile[]>(() => {
    const cs = shuffle(pool.chars).slice(0, 6)
    return shuffle(cs.flatMap((c) => [{ id: c + 'h', c, hanja: true }, { id: c + 't', c, hanja: false }]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, pool.key])
  const [sel, setSel] = useState<Tile | null>(null)
  const [gone, setGone] = useState<string[]>([])
  const [bad, setBad] = useState<string[]>([])
  const [start, setStart] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [result, setResult] = useState<{ sec: number; best: number; record: boolean; sticker: string } | null>(null)
  const back = () => go(pool.key.startsWith('set') ? { name: 'set', set: Number(pool.key.slice(3)) } : { name: 'home' })
  useEffect(() => {
    if (result) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [result])

  const tap = (t: Tile) => {
    if (gone.includes(t.c) || bad.length) return
    if (!sel) { sfx.tap(); setSel(t); return }
    if (sel.id === t.id) { setSel(null); return }
    if (sel.c === t.c && sel.hanja !== t.hanja) {
      sfx.pop()
      const g = [...gone, t.c]
      setGone(g); setSel(null)
      if (g.length === tiles.length / 2) {
        const sec = Math.round((Date.now() - start) / 100) / 10
        const prev = getState().matchBest[pool.key]
        const record = !prev || sec < prev
        if (record) setState({ matchBest: { ...getState().matchBest, [pool.key]: sec } })
        addStars(3)
        setResult({ sec, best: record ? sec : prev, record, sticker: awardSticker() })
      }
    } else {
      sfx.wrong(); setBad([sel.id, t.id]); setSel(null)
      setTimeout(() => setBad([]), 450)
    }
  }
  if (result) {
    return (
      <Done title={result.record ? '새 기록이에요! 🏅' : '짝을 다 찾았어요!'} message={`${result.sec.toFixed(1)}초 걸렸어요 · 가장 빠른 기록 ${result.best.toFixed(1)}초`} stars={3} sticker={result.sticker} actions={<>
        <button className="btn" onClick={() => { setGone([]); setSel(null); setResult(null); setStart(Date.now()); setNow(Date.now()); setRound(round + 1) }}>한 번 더!</button>
        <button className="btn ghost" onClick={back}>그만하기</button>
      </>} />
    )
  }
  return (
    <div className="page run">
      <TopBar title="짝 맞추기" onBack={back} right={<span className="chip">⏱ {((now - start) / 1000).toFixed(1)}초</span>} />
      <p className="count">한자와 뜻·소리를 짝지어요</p>
      <div className="match-grid">
        {tiles.map((t) => {
          const h = lv.byChar.get(t.c)!
          const cls = gone.includes(t.c) ? 'gone' : bad.includes(t.id) ? 'bad' : sel?.id === t.id ? 'sel' : ''
          return (
            <button key={t.id} className={`match-tile ${cls}`} onClick={() => tap(t)}>
              {t.hanja ? <Hj>{t.c}</Hj> : <span>{hunEum(h)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
