// 데이터 검증 + 획순 데이터 생성:  node scripts/build-data.mjs 7
import fs from 'node:fs'
const level = process.argv[2] || '7'
const dir = `src/data/${level}`
const lines = (f) => fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
const chars = lines('chars.txt').map((l) => l.split('|'))
const eums = new Map()
const dueum = (s) => {
  const code = s.charCodeAt(0) - 0xac00
  const cho = Math.floor(code / 588), jung = Math.floor((code % 588) / 28), jong = code % 28
  const iy = [2, 3, 6, 7, 12, 17, 20].includes(jung) // ㅑㅒㅕㅖㅛㅠㅣ
  let c = cho
  if (cho === 5) c = iy ? 11 : 2 // ㄹ→ㅇ/ㄴ
  else if (cho === 2 && iy) c = 11 // ㄴ→ㅇ
  return String.fromCharCode(0xac00 + c * 588 + jung * 28 + jong)
}
for (const [c, , e, , , x] of chars) {
  const set = new Set([e, dueum(e)])
  if (x) x.split('/').forEach((r) => { const s = r.trim().split(' ').pop(); set.add(s); set.add(dueum(s)) })
  eums.set(c, set)
}
const extra = { 六: ['유'], 十: ['시'], 數: ['숫'], 不: ['부'], 車: ['차'] }
for (const [c, l] of Object.entries(extra)) l.forEach((e) => eums.get(c).add(e))
let errors = 0
const err = (m) => { errors++; console.log('❌', m) }
if (new Set(chars.map((c) => c[0])).size !== chars.length) err('중복 한자')
// sets
const inSets = lines('sets.txt').flatMap((l) => [...l.split('|')[2]])
for (const c of eums.keys()) if (inSets.filter((x) => x === c).length !== 1) err(`세트 배정 오류: ${c} (${inSets.filter((x) => x === c).length}회)`)
for (const c of inSets) if (!eums.has(c)) err(`세트에 범위 밖 한자: ${c}`)
// words
const used = new Set()
const checkWord = (w, r) => {
  const cs = [...w], rs = [...r]
  if (cs.length !== rs.length) return err(`길이 불일치: ${w} ${r}`)
  cs.forEach((c, i) => {
    if (!eums.has(c)) return err(`범위 밖 한자: ${w} (${c})`)
    used.add(c)
    if (!eums.get(c).has(rs[i])) err(`독음 확인 필요: ${w} ${r} (${c}≠${rs[i]})`)
  })
}
const seen = new Set()
for (const l of lines('words.txt')) {
  const [w, r, m, s] = l.split('|')
  if (seen.has(w)) err(`중복 단어: ${w}`)
  seen.add(w)
  if (!m) err(`뜻 없음: ${w}`)
  if (s && !s.includes('{}')) err(`예문에 {} 없음: ${w}`)
  checkWord(w, r)
}
let mode = ''
for (const l of lines('pairs.txt')) {
  if (l.startsWith('[')) { mode = l; continue }
  const p = l.split('|')
  if (mode === '[antonym]') p.forEach((c) => eums.has(c) || err(`반의어 범위 밖: ${c}`))
  else checkWord(p[0], p[1])
}
const unused = [...eums.keys()].filter((c) => !used.has(c))
if (unused.length) err(`한자어가 없는 한자: ${unused.join('')}`)
// strokes
const exclude = new Set(lines('stroke-exclude.txt').flatMap((l) => [...l.split('|')[0]]))
const out = {}
for (const c of eums.keys()) {
  if (exclude.has(c)) continue
  const f = `node_modules/hanzi-writer-data/${c}.json`
  if (!fs.existsSync(f)) { err(`획순 데이터 없음: ${c}`); continue }
  const d = JSON.parse(fs.readFileSync(f, 'utf8'))
  const r = (n) => Math.round(n)
  out[c] = {
    strokes: d.strokes.map((s) => s.replace(/-?\d+\.\d+/g, (n) => r(+n))),
    medians: d.medians.map((m) => m.map(([x, y]) => [r(x), r(y)])),
  }
}
fs.writeFileSync(`${dir}/strokes.json`, JSON.stringify(out))
console.log(`한자 ${chars.length}자, 단어 ${seen.size}개, 획순 ${Object.keys(out).length}자, 오류 ${errors}건`)
console.log('획수:', Object.entries(out).map(([c, d]) => c + d.strokes.length).join(' '))
process.exit(errors ? 1 : 0)
