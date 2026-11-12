import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import HanziWriter from 'hanzi-writer'
import type { StrokeData } from '../data'
import type { Question } from '../lib/quiz'
import { sfx, speak } from '../lib/sound'

/** 한자를 명조체로 보여 줘요 */
export const Hj = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`hj ${className}`} lang="ko">{children}</span>
)

export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? <button className="icon-btn" aria-label="뒤로" onClick={() => { sfx.tap(); onBack() }}>←</button> : <span className="icon-gap" />}
      <h1>{title}</h1>
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
      strokeColor: '#2b2f4a', outlineColor: '#d9dcf0', highlightColor: '#ff8a3d', drawingColor: '#4255ff',
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
    <div className="question">
      <p className="q-title">{q.title}</p>
      <div className="q-prompt">
        {q.stroke && <StrokeSvg data={lvStrokes[q.stroke.char]} highlight={q.stroke.index} size={260} />}
        {q.hanja && <Hj className={`q-hanja len${Math.min(4, [...q.hanja].length)}`}>{q.hanja}</Hj>}
        {q.text && <div className={`q-text ${q.text.length > 8 ? 'small' : ''}`}>{q.text}</div>}
        {q.sentence && <div className="q-sentence">{q.sentence[0]}<Hj className="q-mark">{q.sentence[1]}</Hj>{q.sentence[2]}</div>}
        {q.hint && <div className="q-hint">{q.hint}</div>}
      </div>
      <div className={`choices ${long ? 'long' : ''}`}>
        {q.choices.map((c, i) => {
          const state = reveal ? (i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim') : i === picked ? 'picked' : ''
          return (
            <button key={i} className={`choice ${state}`} disabled={reveal} onClick={() => onPick(i)}>
              {c.hanja ? <Hj className="choice-hanja">{c.label}</Hj> : c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Confetti() {
  const bits = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 1.8 + Math.random() * 1.6,
    color: ['#4255ff', '#ffcd1f', '#23b26d', '#ff6b6b', '#a66bff', '#3ccfcf'][i % 6], rot: Math.random() * 360,
  })), [])
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => <i key={i} style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }} />)}
    </div>
  )
}

/** 끝났을 때 칭찬 화면 */
export function Done({ title, message, stars, sticker, children, actions }: { title: string; message?: string; stars?: number; sticker?: string; children?: ReactNode; actions: ReactNode }) {
  useEffect(() => { sfx.fanfare() }, [])
  return (
    <div className="done">
      <Confetti />
      <div className="done-card">
        <div className="mascot big">🐯</div>
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        {stars !== undefined && <div className="done-stars">⭐ 별 {stars}개를 받았어요!</div>}
        {sticker && <div className="done-sticker"><span>{sticker}</span><small>새 스티커!</small></div>}
        {children}
        <div className="done-actions">{actions}</div>
      </div>
    </div>
  )
}

export const SpeakBtn = ({ text }: { text: string }) => (
  <button className="icon-btn" aria-label="소리 듣기" onClick={(e) => { e.stopPropagation(); speak(text) }}>🔊</button>
)
