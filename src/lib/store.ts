// 학습 기록 저장 (기기 안 localStorage)
import { useSyncExternalStore } from 'react'

export interface CharStat { box: number; due: number; ok: number; ng: number }
export interface State {
  level: string
  sound: boolean
  voice: boolean
  chars: Record<string, CharStat>
  stickers: string[]
  stars: number
  exams: { date: number; score: number; total: number; level: string }[]
  matchBest: Record<string, number>
}
const KEY = 'hanja-cards-v1'
const initial: State = { level: '7', sound: true, voice: true, chars: {}, stickers: [], stars: 0, exams: [], matchBest: {} }

function load(): State {
  try { return { ...initial, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return initial }
}
let state = load()
const subs = new Set<() => void>()
export const getState = () => state
export function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* 저장 공간 없음 */ }
  subs.forEach((f) => f())
}
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, getState)

const DAY = 86400000
const GAP = [0, 1, 2, 4, 7, 14] // 상자별 복습 간격(일)
export const MASTERED = 3
export const statOf = (c: string): CharStat => state.chars[c] ?? { box: 0, due: 0, ok: 0, ng: 0 }
/** 문제를 맞히거나 틀렸을 때 한자의 복습 상자를 옮겨요 */
export function grade(cs: string[], correct: boolean) {
  const chars = { ...state.chars }
  for (const c of cs) {
    const s = statOf(c)
    const box = correct ? Math.min(5, s.box + 1) : 1
    chars[c] = { box, due: Date.now() + GAP[box] * DAY, ok: s.ok + (correct ? 1 : 0), ng: s.ng + (correct ? 0 : 1) }
  }
  setState({ chars })
}
export const isDue = (c: string) => { const s = state.chars[c]; return !!s && s.due <= Date.now() }
export const isMastered = (c: string) => statOf(c).box >= MASTERED

export const STICKERS = [...'🐯🐰🐻🐼🦊🐶🐱🦁🐸🐵🐧🐥🦄🐳🐬🦋🐞🐢🦖🐙🍎🍓🍉🍌🍩🍭🧁🍦🚀🚗🚂✈️🎈🎁⚽🎨🎸👑🌈⭐🌙🌻🍀🔥💎🏆'].filter((s) => s !== '️')
/** 새 스티커 한 장 받기 (안 가진 것부터) */
export function awardSticker(special?: string): string {
  const rest = STICKERS.filter((s) => !state.stickers.includes(s))
  const pool = rest.length ? rest : STICKERS
  const s = special ?? pool[Math.floor(Math.random() * pool.length)]
  setState({ stickers: [...state.stickers, s] })
  return s
}
export const addStars = (n: number) => setState({ stars: state.stars + n })
export function resetAll() { setState({ ...initial, sound: state.sound, voice: state.voice }) }
