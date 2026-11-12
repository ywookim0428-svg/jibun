import { useState } from 'react'
import { LEVELS } from './data'
import { useStore } from './lib/store'
import { Home } from './screens/Home'
import { SetScreen } from './screens/SetScreen'
import { Cards } from './screens/Cards'
import { Learn } from './screens/Learn'
import { Match } from './screens/Match'
import { Stroke } from './screens/Stroke'
import { Exam } from './screens/Exam'

export interface Pool { key: string; title: string; chars: string[] }
export type Route =
  | { name: 'home' }
  | { name: 'set'; set: number }
  | { name: 'cards' | 'learn' | 'match' | 'stroke'; pool: Pool }
  | { name: 'exam' }
export type Go = (r: Route) => void

export default function App() {
  const { level } = useStore()
  const lv = LEVELS[level] ?? LEVELS['7']
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [n, setN] = useState(0)
  const go: Go = (r) => { setRoute(r); setN((v) => v + 1); window.scrollTo(0, 0) }
  switch (route.name) {
    case 'set': return <SetScreen lv={lv} index={route.set} go={go} />
    case 'cards': return <Cards key={n} lv={lv} pool={route.pool} go={go} />
    case 'learn': return <Learn key={n} lv={lv} pool={route.pool} go={go} />
    case 'match': return <Match key={n} lv={lv} pool={route.pool} go={go} />
    case 'stroke': return <Stroke key={n} lv={lv} pool={route.pool} go={go} />
    case 'exam': return <Exam key={n} lv={lv} go={go} />
    default: return <Home lv={lv} go={go} />
  }
}
