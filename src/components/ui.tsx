import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import HanziWriter from 'hanzi-writer'
import type { StrokeData } from '../data'
import type { Question } from '../lib/quiz'
import { sfx, speak } from '../lib/sound'

/** 호랑이 친구 "호야". mood에 따라 표정이 바뀌어요 */
export function Mascot({ mood = 'happy', size = 96, className = '' }: { mood?: 'happy' | 'cheer' | 'oops'; size?: number; className?: string }) {
  const ink = '#282e3e'
  return (
    <svg className={`mascot ${mood} ${className}`} viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="호랑이 친구 호야">
      <circle cx="28" cy="30" r="15" fill="#ffa62b" /><circle cx="92" cy="30" r="15" fill="#ffa62b" />
      <circle cx="28" cy="31" r="7" fill="#ffd9b0" /><circle cx="92" cy="31" r="7" fill="#ffd9b0" />
      <circle cx="60" cy="66" r="45" fill="#ffb84d" />
      <g stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M60 23v13M46 27l3 10M74 27l-3 10M17 62h10M19 76h9M103 62H93M101 76h-9" />
      </g>
      <ellipse cx="60" cy="83" rx="24" ry="17" fill="#fff6e8" />
      <circle cx="33" cy="76" r="7" fill="#ff8f7a" opacity=".55" /><circle cx="87" cy="76" r="7" fill="#ff8f7a" opacity=".55" />
      <path d="M54 72h12l-6 7z" fill={ink} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      {mood === 'cheer' ? (
        <>
          <path d="M37 60q7-10 14 0M69 60q7-10 14 0" stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M49 84q11 17 22 0z" fill="#d9483a" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        </>
      ) : mood === 'oops' ? (
        <>
          <circle cx="44" cy="60" r="5.5" fill={ink} /><circle cx="76" cy="60" r="5.5" fill={ink} />
          <path d="M36 50l12 3M84 50l-12 3" stroke={ink} strokeWidth="4" strokeLinecap="round" />
          <path d="M53 91q7-6 14 0" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="44" cy="59" r="6" fill={ink} /><circle cx="76" cy="59" r="6" fill={ink} />
          <circle cx="46" cy="57" r="2" fill="#fff" /><circle cx="78" cy="57" r="2" fill="#fff" />
          <path d="M51 86q9 8 18 0" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  )
}
/** 별이 팡 터지는 효과 */
export const Burst = () => (
  <span className="burst" aria-hidden>{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} style={{ ['--a' as string]: `${i * 45}deg` }} />)}</span>
)

/** 한자를 명조체로 보여 줘요 */
export const Hj = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`hj ${className}`} lang="ko">{children}</span>
)

const ICONS: Record<string, string> = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cards: 'M4 8h12v11H4zM8 8V5h12v11h-4',
  learn: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',
  pen: 'M4 20l1-4L16.5 4.5l3 3L8 19l-4 1zM14 7l3 3',
  match: 'M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7zM4 13h7v7H4z',
  test: 'M8 4h8v3H8zM6 5.5H5v15h14v-15h-1M9 12h6M9 16h6',
  sound: 'M4 10v4h3l5 4V6L7 10H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3.2M20 7h-3c-1.6 0-2.7 1-3.6 2.3M18 4.5L20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5',
  next: 'M9 5l7 7-7 7',
  redo: 'M5 12a7 7 0 1 1 2.2 5.1M5 18v-4h4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  book: 'M5 4h13v16H5zM9 4v16M12 8h3M12 11h3',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4.5l3 2',
  chevron: 'M7 10l5 5 5-5',
}
/** 선으로 그린 아이콘 */
export const Icon = ({ name, size = 24, fill }: { name: string; size?: number; fill?: boolean }) => (
  <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICONS[name]} /></svg>
)

export function TopBar({ title, sub, onBack, right }: { title: ReactNode; sub?: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack && <button className="icon-btn" aria-label="뒤로" onClick={() => { sfx.tap(); onBack() }}><Icon name="back" /></button>}
      <div className="topbar-title"><h1>{title}</h1>{sub && <small>{sub}</small>}</div>
      <div className="topbar-right">{right}</div>
    </header>
  )
}

export const Progress = ({ value, max }: { value: number; max: number }) => (
  <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
    <div style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
  </div>
)

/** 획을 그림으로 보여 줘요. highlight 번째 획은 빨간색 */
export function StrokeSvg({ data, highlight, size = 240 }: { data: StrokeData; highlight?: number; size?: number }) {
  return (
    <svg className="stroke-svg" viewBox="0 0 1024 1024" width={size} height={size} aria-hidden>
      <line x1="512" y1="40" x2="512" y2="984" className="guide" />
      <line x1="40" y1="512" x2="984" y2="512" className="guide" />
      <g transform="scale(1,-1) translate(0,-900)">
        {data.strokes.map((d, i) => <path key={i} d={d} className={i === highlight ? 'hot' : ''} />)}
      </g>
    </svg>
  )
}

/** 획순 애니메이션 / 따라 쓰기 (hanzi-writer) */
export function Writer({ char, data, mode, size, runKey, onDone }: { char: string; data: StrokeData; mode: 'animate' | 'quiz'; size: number; runKey: number; onDone?: (mistakes: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const el = ref.current!
    el.innerHTML = ''
    const writer = HanziWriter.create(el, char, {
      width: size, height: size, padding: size * 0.06,
      charDataLoader: (_c, onLoad) => onLoad(data),
      strokeColor: '#282e3e', outlineColor: '#d9dde8', highlightColor: '#ffcd1f', drawingColor: '#4255ff',
      drawingWidth: Math.max(18, size / 14), strokeAnimationSpeed: 0.8, delayBetweenStrokes: 350,
      showCharacter: mode === 'animate', showOutline: true, showHintAfterMisses: 2, leniency: 1.6,
    })
    let alive = true
    if (mode === 'animate') {
      void writer.animateCharacter({ onComplete: () => { if (alive) done.current?.(0) } })
    } else {
      void writer.quiz({
        onCorrectStroke: () => sfx.stroke(),
        onMistake: () => sfx.wrong(),
        onComplete: (s) => { if (alive) done.current?.(s.totalMistakes) },
      })
    }
    return () => { alive = false; writer.cancelQuiz(); writer.hideCharacter(); el.innerHTML = '' }
  }, [char, data, mode, size, runKey])
  return <div className="writer" style={{ width: size, height: size }} ref={ref} />
}

/** 문제 한 개 화면 */
export function QuestionView({ q, lvStrokes, picked, reveal, onPick }: { q: Question; lvStrokes: Record<string, StrokeData>; picked: number | null; reveal: boolean; onPick: (i: number) => void }) {
  const long = q.choices.some((c) => c.label.length > 9)
  return (
    <div className="q-card">
      <p className="q-label">{q.title}</p>
      <div className="q-prompt">
        {q.stroke && <StrokeSvg data={lvStrokes[q.stroke.char]} highlight={q.stroke.index} size={230} />}
        {q.hanja && <Hj className={`q-hanja len${Math.min(4, [...q.hanja].length)}`}>{q.hanja}</Hj>}
        {q.text && <div className={`q-text ${q.text.length > 8 ? 'small' : ''}`}>{q.text}</div>}
        {q.sentence && <div className="q-sentence">{q.sentence[0]}<Hj className="q-mark">{q.sentence[1]}</Hj>{q.sentence[2]}</div>}
        {q.hint && <div className="q-hint">{q.hint}</div>}
      </div>
      <p className="q-pick">{reveal ? (picked === q.answer ? '정답이에요!' : '괜찮아요, 정답을 확인해요') : '정답을 골라요'}</p>
      <div className={`choices ${long ? 'long' : ''}`}>
        {q.choices.map((c, i) => {
          const state = reveal ? (i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim') : ''
          return (
            <button key={i} className={`choice ${state}`} disabled={reveal} onClick={() => onPick(i)}>
              <span className="num">{state === 'right' ? <Icon name="check" size={18} /> : state === 'wrong' ? <Icon name="close" size={18} /> : i + 1}</span>
              {c.hanja ? <Hj className="choice-hanja">{c.label}</Hj> : <span>{c.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Confetti() {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 1.8 + Math.random() * 1.6,
    color: ['#4255ff', '#ffcd1f', '#18ae79', '#4255ff', '#ffcd1f', '#98a2ff'][i % 6], rot: Math.random() * 360,
  })), [])
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => <i key={i} style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }} />)}
    </div>
  )
}

/** 끝났을 때 결과 화면. score/total을 주면 동그란 점수 그래프를 보여 줘요 */
export function Done({ title, message, score, total, stars, sticker, children, actions }: { title: string; message?: string; score?: number; total?: number; stars?: number; sticker?: string; children?: ReactNode; actions: ReactNode }) {
  useEffect(() => { sfx.fanfare() }, [])
  const pct = total ? Math.round(((score ?? 0) / total) * 100) : null
  return (
    <div className="page done">
      <Confetti />
      <div className="done-card">
        <div className="done-mascot"><Mascot mood="cheer" size={120} className="jump" /><Burst /></div>
        <div className="done-top">
          {pct !== null && (
            <svg className="ring" viewBox="0 0 120 120" width="132" height="132" aria-label={`${pct}퍼센트`}>
              <circle cx="60" cy="60" r="50" className="ring-bg" />
              <circle cx="60" cy="60" r="50" className="ring-fg" strokeDasharray={`${pct * 3.1416} 400`} transform="rotate(-90 60 60)" />
              <text x="60" y="68" textAnchor="middle">{pct}%</text>
            </svg>
          )}
          <div><h2>{title}</h2>{message && <p>{message}</p>}</div>
        </div>
        <div className="done-rewards">
          {stars !== undefined && <div className="reward"><span className="star"><Icon name="star" fill size={30} /></span><b>별 {stars}개</b><small>받았어요</small></div>}
          {sticker && <div className="reward"><span className="sticker stick-in">{sticker}</span><b>새 스티커</b><small>스티커북에 넣었어요</small></div>}
        </div>
        {children}
        <div className="done-actions">{actions}</div>
      </div>
    </div>
  )
}

export const SpeakBtn = ({ text }: { text: string }) => (
  <button className="icon-btn plain" aria-label="소리 듣기" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); speak(text) }}><Icon name="sound" /></button>
)
