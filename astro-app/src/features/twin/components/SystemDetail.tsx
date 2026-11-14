import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STATUS_LABELS, type Status } from '../../admin/data/parameters'
import { HAZARDS, getSystem, type SystemId } from '../../../shared/digitalTwin/knowledge'
import { explain, type SystemState } from '../../../shared/digitalTwin/model'
import { STRESS_PROFILES, stressReactivity } from '../../../shared/digitalTwin/stressProfiles'
import IndicatorCard from './IndicatorCard'

interface Props {
  state: SystemState
  astronautId: string
  fromMl: Set<string>
  doneActions: Set<string>
  onToggleAction: (action: string) => void
  onLog: (systemId: SystemId) => void
  onReport: (systemId: SystemId) => void
}

const TIER: Record<Status, 'self' | 'crew' | 'ground'> = { ok: 'self', warning: 'crew', critical: 'ground' }

export default function SystemDetail({ state, astronautId, fromMl, doneActions, onToggleAction, onLog, onReport }: Props) {
  const sys = getSystem(state.id)
  const worst = [...state.indicators].sort((a, b) => rank(b.status) - rank(a.status))[0]
  const tier = TIER[state.status]

  return (
    <section className={`panel detail detail--${state.status}`}>
      <header className="detail__head">
        <span className="detail__icon">{sys.icon}</span>
        <div>
          <h2>{sys.name}</h2>
          <div className="detail__hazards">
            {sys.hazards.map((h) => (
              <span key={h} className="hazard" title={HAZARDS[h].name}>
                {HAZARDS[h].short}
              </span>
            ))}
          </div>
        </div>
        <span className={`pill pill--${state.status} pill--big`}>{STATUS_LABELS[state.status]}</span>
      </header>

      {worst && (
        <p className={`detail__summary detail__summary--${state.status}`}>
          {state.status === 'ok' ? '✓ Everything in your normal range. ' : '→ '}
          {state.status !== 'ok' && <b>{worst.param.label}: </b>}
          {state.status !== 'ok' && explain(worst)}
        </p>
      )}

      <div className="detail__text">
        <div>
          <h3>What it does</h3>
          <p>{sys.func}</p>
        </div>
        <div>
          <h3>What space does to it</h3>
          <p>{sys.spaceEffect}</p>
        </div>
      </div>

      {state.id === 'brain' && <StressProfileCard astronautId={astronautId} />}

      <h3 className="detail__h">Your indicators</h3>
      <div className="detail__indicators">
        {state.indicators.map((i) => (
          <IndicatorCard key={i.param.id} state={i} howTo={sys.howTo[i.param.id]} fromMl={fromMl.has(i.param.id)} onLog={() => onLog(state.id)} />
        ))}
      </div>

      <h3 className="detail__h">When to act</h3>
      <div className="tiers">
        <div className={`tier ${tier === 'self' ? 'tier--on' : ''}`}>
          <b>🧑‍🚀 You</b>
          <p>{sys.whenToAct.self}</p>
        </div>
        <div className={`tier tier--crew ${tier === 'crew' ? 'tier--on' : ''}`}>
          <b>🩺 Crew Medical Officer</b>
          <p>{sys.whenToAct.crew}</p>
        </div>
        <div className={`tier tier--ground ${tier === 'ground' ? 'tier--on' : ''}`}>
          <b>🌍 Flight surgeons on Earth</b>
          <p>{sys.whenToAct.ground}</p>
        </div>
      </div>

      <h3 className="detail__h">What you can do now</h3>
      <ul className="todo">
        {sys.actions.map((a) => (
          <li key={a}>
            <label className={doneActions.has(a) ? 'todo--done' : ''}>
              <input type="checkbox" checked={doneActions.has(a)} onChange={() => onToggleAction(a)} />
              <span>{a}</span>
              <small>+10 XP</small>
            </label>
          </li>
        ))}
      </ul>

      <div className="detail__buttons">
        <button className="btn" onClick={() => onLog(state.id)}>
          ✎ Log a measurement
        </button>
        <button className={`btn ${state.status !== 'ok' ? 'btn--alert' : 'btn--ghost'}`} onClick={() => onReport(state.id)}>
          📨 Report to Crew Medical Officer
        </button>
      </div>

      <details className="sources">
        <summary>Sources & models</summary>
        <ul>
          {sys.sources.map((s) => (
            <li key={s.title}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}

const rank = (s: Status) => (s === 'critical' ? 2 : s === 'warning' ? 1 : 0)

/** REAL data: this astronaut's twin is calibrated on a real participant's stress test */
function StressProfileCard({ astronautId }: { astronautId: string }) {
  const p = STRESS_PROFILES[astronautId]
  if (!p) return null
  const r = stressReactivity(p)
  return (
    <div className="stressprof">
      <div className="stressprof__text">
        <h3>Your stress reactivity · real data</h3>
        <p>
          Calibrated on a real lab stress test (participant <b>{p.participant}</b>): rest <b>{p.baseline}/10</b> → peak <b>{p.peak}/10</b>.
          Reactivity: <b className={`react react--${r.level}`}>{r.level}</b>. The twin uses it to predict how strongly you respond to
          stressful events.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={p.stages} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <XAxis dataKey="stage" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-25} textAnchor="end" height={38} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Tooltip cursor={{ fill: 'rgba(45,212,191,0.08)' }} contentStyle={{ background: '#06101a', border: '1px solid #134e4a', fontSize: 12 }} />
          <Bar dataKey="score" name="Stress (0–10)" radius={[4, 4, 0, 0]}>
            {p.stages.map((s) => (
              <Cell key={s.stage} fill={/Baseline|Rest/.test(s.stage) ? '#38bdf8' : '#2dd4bf'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
