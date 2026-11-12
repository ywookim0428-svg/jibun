import { useState } from 'react'
import type { LevelData } from '../data'
import { Done, Hj, Progress, QuestionView, TopBar } from '../components/ui'
import { buildExam, type Question } from '../lib/quiz'
import { sfx } from '../lib/sound'
import { addStars, awardSticker, getState, grade, setState, useStore } from '../lib/store'
import type { Go } from '../App'

export function Exam({ lv, go }: { lv: LevelData; go: Go }) {
  const st = useStore()
  const [qs, setQs] = useState<Question[] | null>(null)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [sticker, setSticker] = useState('')
  const [review, setReview] = useState(false)
  const home = () => go({ name: 'home' })
  const ex = lv.exam
  const start = (n: number) => { sfx.tap(); setQs(buildExam(lv, n)); setI(0); setAnswers([]); setReview(false) }

  if (!qs) {
    const last = st.exams.filter((e) => e.level === lv.id).slice(-5).reverse()
    return (
      <div className="page">
        <TopBar title="📝 모의시험" onBack={home} />
        <div className="exam-intro">
          <div className="mascot big">🐯</div>
          <h2>{ex.name} 시험처럼 풀어 봐요</h2>
          <p>진짜 시험은 {ex.total}문제 중에 {ex.pass}문제를 맞히면 합격이에요.<br />답을 고르면 바로 다음 문제로 넘어가요.</p>
          <ul className="exam-parts">{ex.parts.map((p) => <li key={p.type}><span>{p.label}</span><b>{p.count}문제</b></li>)}</ul>
          <div className="done-actions">
            <button className="btn yellow" onClick={() => start(20)}>🐣 작은 시험 (20문제쯤)</button>
            <button className="btn" onClick={() => start(ex.total)}>🏆 진짜 시험 ({ex.total}문제)</button>
          </div>
          {last.length > 0 && <div className="exam-hist"><h3>지난 기록</h3>{last.map((e) => <p key={e.date}>{new Date(e.date).toLocaleDateString('ko-KR')} · {e.score} / {e.total}점 {e.score / e.total >= ex.pass / ex.total ? '✅ 합격' : ''}</p>)}</div>}
        </div>
      </div>
    )
  }
  if (i >= qs.length) {
    const score = qs.filter((q, n) => answers[n] === q.answer).length
    const need = Math.ceil((qs.length * ex.pass) / ex.total)
    const pass = score >= need
    const wrong = qs.map((q, n) => ({ q, a: answers[n] })).filter((x) => x.a !== x.q.answer)
    if (review) {
      return (
        <div className="page">
          <TopBar title={`틀린 문제 ${wrong.length}개`} onBack={() => setReview(false)} />
          <ul className="review">
            {wrong.map(({ q, a }, n) => (
              <li key={n}>
                <small>{q.title}</small>
                <div className="review-q">{q.sentence ? <>{q.sentence[0]}<Hj className="q-mark">{q.sentence[1]}</Hj>{q.sentence[2]}</> : q.hanja ? <Hj>{q.hanja}</Hj> : q.stroke ? <Hj>{q.stroke.char}</Hj> : q.text}</div>
                <p><span className="bad">내 답: {q.choices[a]?.hanja ? <Hj>{q.choices[a].label}</Hj> : q.choices[a]?.label}</span> → <span className="good">{q.explain}</span></p>
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return (
      <Done title={pass ? '합격이에요! 🎉' : '끝까지 풀었어요!'} message={`${qs.length}문제 중에 ${score}문제를 맞혔어요 (합격은 ${need}문제부터)`} stars={score} sticker={sticker} actions={<>
        {wrong.length > 0 && <button className="btn" onClick={() => setReview(true)}>틀린 문제 보기</button>}
        <button className="btn ghost" onClick={() => setQs(null)}>다시 풀기</button>
        <button className="btn ghost" onClick={home}>처음으로</button>
      </>}>
        <ul className="exam-parts">
          {ex.parts.map((p) => {
            const types = p.type === 'hunEum' ? ['hunEum', 'findHanja'] : [p.type]
            const mine = qs.map((q, n) => ({ q, ok: answers[n] === q.answer })).filter((x) => types.includes(x.q.type))
            return mine.length ? <li key={p.type}><span>{p.label}</span><b>{mine.filter((x) => x.ok).length} / {mine.length}</b></li> : null
          })}
        </ul>
      </Done>
    )
  }
  const q = qs[i]
  const pick = (n: number) => {
    sfx.tap()
    const all = [...answers, n]
    setAnswers(all)
    grade(q.chars, n === q.answer)
    if (i + 1 >= qs.length) {
      const score = qs.filter((x, k) => all[k] === x.answer).length
      const pass = score >= Math.ceil((qs.length * ex.pass) / ex.total)
      setState({ exams: [...getState().exams, { date: Date.now(), score, total: qs.length, level: lv.id }] })
      addStars(score)
      setSticker(awardSticker(pass && qs.length >= ex.total ? '🏆' : undefined))
    }
    setI(i + 1)
  }
  return (
    <div className="page run">
      <TopBar title={`모의시험 ${i + 1} / ${qs.length}`} onBack={() => setQs(null)} />
      <Progress value={i} max={qs.length} />
      <QuestionView key={i} q={q} lvStrokes={lv.strokes} picked={null} reveal={false} onPick={pick} />
    </div>
  )
}
