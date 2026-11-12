// 급수 데이터 불러오기. 새 급수를 추가하려면 src/data/<급수>/ 폴더를 만들고 아래 LEVELS에 등록하세요.
import chars7 from './7/chars.txt?raw'
import sets7 from './7/sets.txt?raw'
import words7 from './7/words.txt?raw'
import pairs7 from './7/pairs.txt?raw'
import strokeQuiz7 from './7/stroke-quiz.txt?raw'
import strokeOrder7 from './7/stroke-order.txt?raw'
import strokes7 from './7/strokes.json'
import exam7 from './7/exam.json'

export interface HanjaChar { c: string; hun: string; eum: string; level: string; easy: string; alt?: string; set: number }
export interface Word { w: string; r: string; m: string; s?: string }
export interface StudySet { name: string; icon: string; chars: string[] }
export interface StrokeData { strokes: string[]; medians: number[][][] }
export type QType = 'hunEum' | 'findHanja' | 'reading' | 'meaning' | 'antonym' | 'idiom' | 'stroke'
export interface ExamSpec { name: string; org: string; total: number; pass: number; parts: { type: string; count: number; label: string }[] }
export interface LevelData {
  id: string
  exam: ExamSpec
  chars: HanjaChar[]
  byChar: Map<string, HanjaChar>
  sets: StudySet[]
  words: Word[]
  antonyms: [string, string][]
  idioms: Word[]
  strokes: Record<string, StrokeData>
  strokeQuiz: Set<string>
}

const lines = (raw: string) => raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))

function build(id: string, r: { chars: string; sets: string; words: string; pairs: string; strokeQuiz: string; strokeOrder: string; strokes: unknown; exam: ExamSpec }): LevelData {
  const sets = lines(r.sets).map((l) => { const [name, icon, cs] = l.split('|'); return { name, icon, chars: [...cs] } })
  const setOf = new Map<string, number>()
  sets.forEach((s, i) => s.chars.forEach((c) => setOf.set(c, i)))
  const chars = lines(r.chars).map((l) => {
    const [c, hun, eum, level, easy, alt] = l.split('|')
    return { c, hun, eum, level, easy, alt: alt || undefined, set: setOf.get(c) ?? 0 }
  })
  const words = lines(r.words).map((l) => { const [w, rd, m, s] = l.split('|'); return { w, r: rd, m, s: s || undefined } })
  const antonyms: [string, string][] = []
  const idioms: Word[] = []
  let mode = ''
  for (const l of lines(r.pairs)) {
    if (l.startsWith('[')) { mode = l; continue }
    const p = l.split('|')
    if (mode === '[antonym]') antonyms.push([p[0], p[1]])
    else idioms.push({ w: p[0], r: p[1], m: p[2] })
  }
  const strokes = structuredClone(r.strokes) as Record<string, StrokeData>
  for (const l of lines(r.strokeOrder)) {
    const [c, order] = l.split('|')
    const d = strokes[c]
    if (!d) continue
    const idx = order.split(',').map(Number)
    strokes[c] = { strokes: idx.map((i) => d.strokes[i]), medians: idx.map((i) => d.medians[i]) }
  }
  const strokeQuiz = new Set([...lines(r.strokeQuiz).join('')].filter((c) => strokes[c]))
  return { id, exam: r.exam, chars, byChar: new Map(chars.map((c) => [c.c, c])), sets, words, antonyms, idioms, strokes, strokeQuiz }
}

export const LEVELS: Record<string, LevelData> = {
  '7': build('7', { chars: chars7, sets: sets7, words: words7, pairs: pairs7, strokeQuiz: strokeQuiz7, strokeOrder: strokeOrder7, strokes: strokes7, exam: exam7 }),
}
/** 급수 선택 화면에 보여 줄 목록 (ready가 false면 "준비 중") */
export const LEVEL_LIST = [
  { id: '8', name: '8급', ready: false },
  { id: '7', name: '7급', ready: true },
  { id: '6', name: '6급', ready: false },
  { id: '5', name: '5급', ready: false },
]

export const hunEum = (h: HanjaChar) => `${h.hun} ${h.eum}`
export const wordsWith = (lv: LevelData, c: string) => lv.words.filter((w) => w.w.includes(c))
