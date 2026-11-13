// 문제 만들기: 한자능력검정시험에 나오는 유형을 모두 객관식으로 만들어요.
import { hunEum, type LevelData, type QType, type Word } from '../data'
import { SIMILAR } from '../data/similar'
import { statOf } from './store'

export interface Choice { label: string; hanja?: boolean }
export interface Question {
  type: QType
  title: string
  hanja?: string // 크게 보여 줄 한자(어)
  text?: string // 크게 보여 줄 한글
  sentence?: [string, string, string] // 앞, 한자어, 뒤
  hint?: string
  stroke?: { char: string; index: number }
  choices: Choice[]
  answer: number
  chars: string[] // 이 문제로 점수를 매길 한자
  explain: string
  say?: string
}

export const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

function finish(q: Omit<Question, 'choices' | 'answer'>, right: Choice, wrong: Choice[], keepOrder = false): Question {
  let choices = [right, ...wrong.slice(0, 3)]
  choices = keepOrder ? choices.sort((a, b) => Number(a.label) - Number(b.label)) : shuffle(choices)
  return { ...q, choices, answer: choices.indexOf(right) }
}
/** 헷갈리기 쉬운 한자를 앞세운 오답 후보 */
function charDistractors(lv: LevelData, c: string, ban: string[] = []): string[] {
  const sim = shuffle([...new Set(SIMILAR.filter((g) => g.includes(c)).flatMap((g) => [...g]))])
  const me = lv.byChar.get(c)!
  const sameSet = shuffle(lv.chars.filter((h) => h.set === me.set).map((h) => h.c))
  const rest = shuffle(lv.chars.map((h) => h.c))
  const seen = new Set([c, ...ban])
  const out: string[] = []
  for (const x of [...sim.slice(0, 2), ...sameSet.slice(0, 3), ...rest]) {
    if (!lv.byChar.has(x) || seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  return out
}

export function qHunEum(lv: LevelData, c: string): Question {
  const h = lv.byChar.get(c)!
  const wrong = charDistractors(lv, c).map((x) => ({ label: hunEum(lv.byChar.get(x)!) }))
  return finish({ type: 'hunEum', title: '이 한자의 뜻과 소리는?', hanja: c, chars: [c], explain: `${c} → ${hunEum(h)}`, say: hunEum(h) }, { label: hunEum(h) }, wrong)
}
export function qFindHanja(lv: LevelData, c: string): Question {
  const h = lv.byChar.get(c)!
  const wrong = charDistractors(lv, c).map((x) => ({ label: x, hanja: true }))
  return finish({ type: 'findHanja', title: '알맞은 한자를 찾아요', text: hunEum(h), chars: [c], explain: `${hunEum(h)} → ${c}`, say: hunEum(h) }, { label: c, hanja: true }, wrong)
}
function wordDistractors(lv: LevelData, w: Word, key: 'r' | 'm' | 'w'): Word[] {
  const ok = (x: Word) => x.w !== w.w && x.r !== w.r && x.m !== w.m && x.w.length === w.w.length
  const share = shuffle(lv.words.filter((x) => ok(x) && [...x.w].some((c) => w.w.includes(c))))
  const rest = shuffle(lv.words.filter(ok))
  const seen = new Set<string>([w[key]])
  const out: Word[] = []
  for (const x of [...share.slice(0, 2), ...rest]) { if (!seen.has(x[key])) { seen.add(x[key]); out.push(x) } }
  return out
}
export function qReading(lv: LevelData, w: Word, focus: string[], useSentence = true): Question {
  const wrong = wordDistractors(lv, w, 'r').map((x) => ({ label: x.r }))
  const base = { type: 'reading' as const, chars: focus, explain: `${w.w} → ${w.r} (${w.m})`, say: w.r }
  if (w.s && useSentence) {
    const [a, b] = w.s.split('{}')
    return finish({ ...base, title: '색칠한 한자어를 읽어요', sentence: [a, w.w, b] }, { label: w.r }, wrong)
  }
  return finish({ ...base, title: '이 한자어를 읽어요', hanja: w.w }, { label: w.r }, wrong)
}
export function qMeaning(lv: LevelData, w: Word, focus: string[]): Question {
  const base = { type: 'meaning' as const, chars: focus, explain: `${w.w}(${w.r}) → ${w.m}`, say: w.r }
  if (Math.random() < 0.5) {
    const wrong = wordDistractors(lv, w, 'm').map((x) => ({ label: x.m }))
    return finish({ ...base, title: '이 한자어의 뜻은?', hanja: w.w, hint: w.r }, { label: w.m }, wrong)
  }
  const wrong = wordDistractors(lv, w, 'w').map((x) => ({ label: x.w, hanja: true }))
  return finish({ ...base, title: '뜻에 맞는 한자어를 찾아요', text: w.m }, { label: w.w, hanja: true }, wrong)
}
export function qAntonym(lv: LevelData, pair: [string, string]): Question {
  const [a, b] = Math.random() < 0.5 ? pair : [pair[1], pair[0]]
  const partners = lv.antonyms.filter((p) => p.includes(a)).flat()
  const wrong = charDistractors(lv, b, partners).map((x) => ({ label: x, hanja: true }))
  const ha = lv.byChar.get(a)!, hb = lv.byChar.get(b)!
  return finish({ type: 'antonym', title: '뜻이 반대인 한자를 찾아요', hanja: a, hint: hunEum(ha), chars: [a, b], explain: `${a}(${hunEum(ha)}) ↔ ${b}(${hunEum(hb)})`, say: `${hunEum(ha)}, ${hunEum(hb)}` }, { label: b, hanja: true }, wrong)
}
export function qIdiom(lv: LevelData, w: Word, focusChar?: string): Question {
  const cs = [...w.w]
  const at = focusChar && cs.includes(focusChar) ? cs.indexOf(focusChar) : Math.floor(Math.random() * cs.length)
  const c = cs[at]
  const wrong = charDistractors(lv, c, cs).map((x) => ({ label: x, hanja: true }))
  const blanked = cs.map((x, i) => (i === at ? '□' : x)).join('')
  return finish({ type: 'idiom', title: '빈칸에 들어갈 한자는?', hanja: blanked, hint: `${w.r} · ${w.m}`, chars: [c], explain: `${w.w}(${w.r}): ${w.m}`, say: w.r }, { label: c, hanja: true }, wrong)
}
export function qStroke(lv: LevelData, c: string): Question | null {
  const d = lv.strokes[c]
  if (!d || !lv.strokeQuiz.has(c) || d.strokes.length < 3) return null
  const n = d.strokes.length
  const index = Math.floor(Math.random() * n)
  const others = shuffle([...Array(n).keys()].filter((i) => i !== index)).slice(0, 3)
  const names = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두', '열세', '열네', '열다섯', '열여섯', '열일곱']
  const label = (i: number) => `${i + 1}`
  return finish({ type: 'stroke', title: '빨간 획은 몇 번째로 쓸까요?', stroke: { char: c, index }, chars: [c], explain: `${c}: 빨간 획은 ${names[index]} 번째로 써요`, say: `${names[index]} 번째` }, { label: label(index) }, others.map((i) => ({ label: label(i) })), true)
}

/** 한자 하나에 대해 낼 수 있는 문제를 골고루 하나 만들어요 */
export function questionFor(lv: LevelData, c: string, allowed: Set<string>): Question {
  const words = lv.words.filter((w) => w.w.includes(c) && [...w.w].every((x) => allowed.has(x)))
  const anyWords = words.length ? words : lv.words.filter((w) => w.w.includes(c))
  const pairs = lv.antonyms.filter((p) => p.includes(c))
  const idioms = lv.idioms.filter((w) => w.w.includes(c))
  const box = statOf(c).box
  const makers: (() => Question | null)[] = [() => qHunEum(lv, c), () => qHunEum(lv, c), () => qFindHanja(lv, c)]
  if (box >= 1) {
    if (anyWords.length) makers.push(() => qReading(lv, pick(anyWords), [c]), () => qReading(lv, pick(anyWords), [c]), () => qMeaning(lv, pick(anyWords), [c]))
    if (pairs.length) makers.push(() => qAntonym(lv, pick(pairs)))
    if (idioms.length) makers.push(() => qIdiom(lv, pick(idioms), c))
    if (lv.strokeQuiz.has(c)) makers.push(() => qStroke(lv, c))
  }
  return pick(makers)() ?? qHunEum(lv, c)
}

/** 학습 한 판: 덜 익힌 한자부터 n문제 */
export function buildRound(lv: LevelData, pool: string[], n = 10): Question[] {
  const allowed = new Set(lv.chars.map((h) => h.c))
  const order = shuffle(pool).sort((a, b) => statOf(a).box - statOf(b).box)
  const out: Question[] = []
  for (let i = 0; out.length < n; i++) out.push(questionFor(lv, order[i % order.length], allowed))
  return shuffle(out)
}

/** 모의시험: exam.json의 유형별 문항 수 비율대로 출제 */
export function buildExam(lv: LevelData, total = lv.exam.total): Question[] {
  const scale = total / lv.exam.total
  const out: Question[] = []
  const strokeChars = shuffle([...lv.strokeQuiz])
  for (const part of lv.exam.parts) {
    const count = Math.max(1, Math.round(part.count * scale))
    if (part.type === 'reading') shuffle(lv.words).slice(0, count).forEach((w, i) => out.push(qReading(lv, w, [...w.w], i % 2 === 0)))
    else if (part.type === 'hunEum') shuffle(lv.chars).slice(0, count).forEach((h, i) => out.push(i % 3 === 2 ? qFindHanja(lv, h.c) : qHunEum(lv, h.c)))
    else if (part.type === 'antonym') shuffle(lv.antonyms).slice(0, count).forEach((p) => out.push(qAntonym(lv, p)))
    else if (part.type === 'idiom') shuffle(lv.idioms).slice(0, count).forEach((w) => out.push(qIdiom(lv, w)))
    else if (part.type === 'meaning') shuffle(lv.words).slice(0, count).forEach((w) => out.push(qMeaning(lv, w, [...w.w])))
    else if (part.type === 'stroke') strokeChars.slice(0, count).forEach((c) => { const q = qStroke(lv, c); if (q) out.push(q) })
  }
  return out
}
