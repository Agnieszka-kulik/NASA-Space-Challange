import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SpaceBackground from '../../shared/components/SpaceBackground'
import BodyFigure, { type CardInfo } from '../../shared/digitalTwin/BodyFigure'
import { hasWebGL } from '../../shared/digitalTwin/webgl'

const BodyTwin3D = lazy(() => import('../../shared/digitalTwin/BodyTwin3D'))
import { ROUTINE, SYSTEMS, getSystem, type SystemId } from '../../shared/digitalTwin/knowledge'
import { applyLog, buildTwinData, evaluateTwin, getTwinParam, explain, evaluateIndicator, fmt, type MlExport, type SystemState, type TwinData } from '../../shared/digitalTwin/model'
import { forecast, forecastStatus, type Countermeasures, type ForecastPoint, type MissionProfileId } from '../../shared/digitalTwin/forecast'
import { STRESS_PROFILES, stressReactivity } from '../../shared/digitalTwin/stressProfiles'
import { getMessageLog, newId, publish, subscribe, type MissionMessage } from '../../shared/api/missionChannel'
import { CREW, MISSION } from '../admin/data/mockData'
import { STATUS_COLORS, STATUS_LABELS, worstStatus, type Status } from '../admin/data/parameters'
import CrewAvatar from '../admin/components/CrewAvatar'
import SystemDetail from './components/SystemDetail'
import LogMeasurement, { type LogResult } from './components/LogMeasurement'
import ForecastPanel from './components/ForecastPanel'
import './DigitalTwinPage.css'

type Mode = 'now' | 'forecast'

const storage = {
  get(key: string, fallback: number) {
    try {
      return Number(localStorage.getItem(key) ?? fallback)
    } catch {
      return fallback
    }
  },
  set(key: string, value: number) {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      /* storage unavailable */
    }
  },
}

export default function DigitalTwinPage() {
  const { astronautId = 'a5' } = useParams()
  const navigate = useNavigate()
  const member = CREW.find((c) => c.id === astronautId) ?? CREW[0]

  // ---------- data ----------
  const [ml, setMl] = useState<MlExport | null>(null)
  useEffect(() => {
    // real ML results exported by ml/export_twin_ml.py (optional)
    fetch('/twin/ml_export.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: MlExport | null) => setMl(j && j.astronauts ? j : null))
      .catch(() => setMl(null))
  }, [])

  const [logs, setLogs] = useState<Record<string, Record<string, number>>>({})
  const data: TwinData = useMemo(() => {
    const base = buildTwinData(member.id, 42, ml)
    return logs[member.id] ? applyLog(base, logs[member.id]) : base
  }, [member.id, ml, logs])
  const systems = useMemo(() => evaluateTwin(data), [data])
  const overall: Status = worstStatus(Object.values(systems).map((s) => s.status))
  const heartRate = data.series.heartRate.filter((p) => p.actual !== null).at(-1)?.actual ?? 64

  // ---------- UI state ----------
  const [selected, setSelected] = useState<SystemId>(() => {
    const worst = Object.values(evaluateTwin(buildTwinData(member.id))).sort((a, b) => rank(b.status) - rank(a.status))[0]
    return worst?.id ?? 'heart'
  })
  const [mode, setMode] = useState<Mode>('now')
  const [view, setView] = useState<'3d' | '2d'>(() => (hasWebGL() ? '3d' : '2d'))
  const [logFor, setLogFor] = useState<SystemId | null | 'all'>(null)
  const [feedback, setFeedback] = useState<{ lines: { label: string; text: string; status: Status }[]; systems: SystemId[] } | null>(null)
  const [doneActions, setDoneActions] = useState<Set<string>>(new Set())
  const [doneRoutine, setDoneRoutine] = useState<Set<string>>(new Set())
  const xpKey = `duck-twin-xp-${member.id}`
  const [xp, setXp] = useState(() => storage.get(xpKey, 120))
  const addXp = (n: number) =>
    setXp((x) => {
      storage.set(xpKey, x + n)
      return x + n
    })

  // ---------- forecast ----------
  const [profile, setProfile] = useState<MissionProfileId>('mars')
  const [cm, setCm] = useState<Countermeasures>({ exercise: true, nutrition: false, sleep: false })
  const [day, setDay] = useState(180)
  const boneFactor = useMemo(() => personalBoneFactor(data), [data])
  const stressFactor = stressReactivity(STRESS_PROFILES[member.id]).factor
  const withCm = useMemo(() => forecast({ profile, cm, boneFactor, stressFactor }), [profile, cm, boneFactor, stressFactor])
  const without = useMemo(() => forecast({ profile, cm: { exercise: false, nutrition: false, sleep: false }, boneFactor, stressFactor }), [profile, boneFactor, stressFactor])
  const forecastPoint = withCm[Math.min(day, withCm.length - 1)]

  const figureStatuses: Partial<Record<SystemId, Status>> =
    mode === 'now' ? Object.fromEntries(Object.values(systems).map((s) => [s.id, s.status])) : { ...forecastStatus(forecastPoint) }

  const cards: Partial<Record<SystemId, CardInfo>> =
    mode === 'now'
      ? Object.fromEntries(Object.values(systems).map((st) => [st.id, nowCard(st)]))
      : forecastCards(withCm, Math.min(day, withCm.length - 1))

  // ---------- inbox (messages from the Crew Medical Officer console) ----------
  const [inbox, setInbox] = useState<MissionMessage[]>([])
  useEffect(() => {
    const mine = (m: MissionMessage) =>
      (m.type === 'recommendation' || m.type === 'exam' || m.type === 'scenario') &&
      (m.type === 'scenario' || m.astronautId === member.id || m.astronautId === 'all')
    setInbox(getMessageLog().filter(mine).slice(-5).reverse())
    return subscribe((m) => mine(m) && setInbox((x) => [m, ...x].slice(0, 5)))
  }, [member.id])

  // ---------- actions ----------
  const saveLog = (r: LogResult) => {
    const merged = { ...(logs[member.id] ?? {}), ...r.values }
    setLogs((l) => ({ ...l, [member.id]: merged }))
    const updated = applyLog(buildTwinData(member.id, 42, ml), merged)
    const lines = Object.keys(r.values)
      .filter((id) => updated.series[id])
      .map((id) => {
        const st = evaluateIndicator(getTwinParam(id), updated.series[id])
        return { label: st.param.label, text: explain(st), status: st.status }
      })
    const affected = SYSTEMS.filter((s) => s.indicators.some((i) => r.values[i] !== undefined)).map((s) => s.id)
    setFeedback({ lines, systems: affected })
    const gained = ROUTINE.filter((t) => r.values[t.id] !== undefined && !doneRoutine.has(t.id))
    setDoneRoutine((d) => new Set([...d, ...gained.map((g) => g.id)]))
    addXp(10 + gained.reduce((s, g) => s + g.xp, 0))
    if (r.symptoms.length || r.photo || r.note) {
      publish({
        type: 'crew-report',
        id: newId(),
        astronautId: member.id,
        systemId: 'immune',
        text: `Logged: ${r.symptoms.join(', ') || 'no symptoms'}${r.note ? ` – “${r.note}”` : ''}`,
        photo: r.photo ?? undefined,
        sentAt: Date.now(),
        deliverAt: Date.now(),
      })
    }
    setLogFor(null)
  }

  const report = (id: SystemId) => {
    const st = systems[id]
    const flagged = st.indicators.filter((i) => i.status !== 'ok').map((i) => `${i.param.label} ${i.latest?.actual} ${i.param.unit}`)
    publish({
      type: 'crew-report',
      id: newId(),
      astronautId: member.id,
      systemId: id,
      text: `${getSystem(id).name}: ${flagged.join(', ') || 'no flagged values'} – requesting advice.`,
      sentAt: Date.now(),
      deliverAt: Date.now(),
    })
    setFeedback({ lines: [{ label: 'Report sent', text: `Your ${getSystem(id).name.toLowerCase()} data was sent to the Crew Medical Officer (on board – arrives instantly).`, status: 'ok' }], systems: [] })
  }

  const toggleAction = (a: string) =>
    setDoneActions((d) => {
      const n = new Set(d)
      if (n.has(a)) n.delete(a)
      else {
        n.add(a)
        addXp(10)
      }
      return n
    })

  const due = ROUTINE.filter((t) => MISSION.currentDay % t.every === 0)

  return (
    <SpaceBackground>
      <div className="twin">
        {/* ---------- header ---------- */}
        <header className="twin__header">
          <Link to="/" className="twin__back">
            ← Back
          </Link>
          <h1>Digital Twin</h1>
          <div className="twin__who">
            <CrewAvatar member={member} />
            <div>
              <b>{member.name.toUpperCase()}</b>
              <span>
                {member.role} · mission day {MISSION.currentDay}
              </span>
            </div>
          </div>
          <span className={`pill pill--${overall} pill--big`}>Overall: {STATUS_LABELS[overall]}</span>
          <div className="twin__xp" title="Earned by measurements and health actions">
            ⭐ {xp} XP
          </div>
          <select className="twin__select" value={member.id} onChange={(e) => navigate(`/twin/${e.target.value}`)} aria-label="Switch astronaut (demo)">
            {CREW.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} – {c.role}
              </option>
            ))}
          </select>
        </header>

        {inbox.length > 0 && (
          <div className="inbox">
            <b>📨 From your Crew Medical Officer</b>
            {inbox.slice(0, 2).map((m) => (
              <span key={m.id} className="inbox__msg">
                {'text' in m ? m.text : ''}
              </span>
            ))}
          </div>
        )}

        {feedback && (
          <div className="feedback">
            <div className="feedback__lines">
              {feedback.lines.map((l) => (
                <div key={l.label}>
                  <i style={{ background: STATUS_COLORS[l.status] }} /> <b>{l.label}:</b> {l.text}
                </div>
              ))}
            </div>
            {feedback.lines.some((l) => l.status !== 'ok') && feedback.systems[0] && (
              <button className="btn btn--alert" onClick={() => report(feedback.systems[0])}>
                📨 Send to Crew Medical Officer
              </button>
            )}
            <button className="modal__x" onClick={() => setFeedback(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        {/* ---------- today's routine (strip) ---------- */}
        <section className="routine-strip">
          <b>🗓 Today’s routine · day {MISSION.currentDay}</b>
          {due.map((t) => (
            <button
              key={t.id}
              className={`rchip ${doneRoutine.has(t.id) ? 'rchip--done' : ''}`}
              onClick={() => !doneRoutine.has(t.id) && setLogFor(t.system)}
              disabled={doneRoutine.has(t.id)}
            >
              {doneRoutine.has(t.id) ? '✅' : '⬜'} {t.label} <small>+{t.xp} XP</small>
            </button>
          ))}
        </section>

        <div className="twin__grid">
          {/* ---------- middle: the twin figure ---------- */}
          <section className={`panel twin__figure ${mode === 'forecast' ? 'twin__figure--forecast' : ''}`}>
            <div className="twin__toolbar">
            <div className="seg">
              <button className={`seg__btn ${view === '3d' ? 'seg__btn--active' : ''}`} onClick={() => setView('3d')} disabled={!hasWebGL()}>
                3D
              </button>
              <button className={`seg__btn ${view === '2d' ? 'seg__btn--active' : ''}`} onClick={() => setView('2d')}>
                2D
              </button>
            </div>
            <div className="seg twin__mode">
              <button className={`seg__btn ${mode === 'now' ? 'seg__btn--active' : ''}`} onClick={() => setMode('now')}>
                Now
              </button>
              <button className={`seg__btn ${mode === 'forecast' ? 'seg__btn--active seg__btn--sim' : ''}`} onClick={() => setMode('forecast')}>
                🔭 Mission forecast
              </button>
            </div>
            </div>
            {mode === 'forecast' && (
              <div className="twin__forecast-tag">
                PREDICTION · day {forecastPoint.day} · {forecastPoint.phase}
              </div>
            )}
            {view === '3d' ? (
              <Suspense fallback={<div className="twin__loading">Loading 3D twin…</div>}>
                <BodyTwin3D
                  statuses={figureStatuses}
                  cards={cards}
                  selected={selected}
                  onSelect={setSelected}
                  heartRate={heartRate}
                  forecastMode={mode === 'forecast'}
                />
              </Suspense>
            ) : (
              <BodyFigure
                statuses={figureStatuses}
                cards={cards}
                selected={selected}
                onSelect={setSelected}
                heartRate={heartRate}
                forecastMode={mode === 'forecast'}
              />
            )}
            <div className="twin__legend">
              <span><i className="dot dot--ok" /> nominal</span>
              <span><i className="dot dot--warning" /> warning</span>
              <span><i className="dot dot--critical" /> critical</span>
              {mode === 'forecast' && <span><i className="dot dot--none" /> no long-term model</span>}
              <span className="muted">Tap a body part or a data card</span>
            </div>
            <p className="twin__hint">
              ❤️ beating at your heart rate ({heartRate} BPM) · your twin learns your personal normal from every measurement
            </p>
            {mode === 'now' && (
              <button className="btn twin__logall" onClick={() => setLogFor('all')}>
                ✎ Log measurements
              </button>
            )}
          </section>

          {/* ---------- right: detail or forecast ---------- */}
          <div className="twin__right">
            {mode === 'now' ? (
              <SystemDetail
                state={systems[selected]}
                astronautId={member.id}
                fromMl={data.fromMl}
                doneActions={doneActions}
                onToggleAction={toggleAction}
                onLog={(id) => setLogFor(id)}
                onReport={report}
              />
            ) : (
              <ForecastPanel
                profile={profile}
                onProfile={(p) => {
                  setProfile(p)
                  setDay(p === 'iss' ? 120 : 180)
                }}
                cm={cm}
                onCm={setCm}
                day={day}
                onDay={setDay}
                withCm={withCm}
                without={without}
                boneFactor={boneFactor}
              />
            )}
          </div>
        </div>

        {logFor !== null && <LogMeasurement focus={logFor === 'all' ? null : logFor} onClose={() => setLogFor(null)} onSave={saveLog} />}
      </div>
    </SpaceBackground>
  )
}

const rank = (s: Status) => (s === 'critical' ? 2 : s === 'warning' ? 1 : 0)

/** how much faster/slower than the mission prediction this astronaut's bones are changing */
function personalBoneFactor(data: TwinData) {
  const s = data.series.boneDensity.filter((p) => p.actual !== null)
  if (s.length < 2) return 1
  const first = s[0]
  const last = s[s.length - 1]
  const observed = (last.actual as number) - (first.actual as number)
  const expected = last.predicted - first.predicted
  if (expected >= 0) return 1
  return Math.min(2.2, Math.max(0.6, observed / expected))
}

/** data card for the hologram: the most important indicator of a body system */
function nowCard(st: SystemState): CardInfo {
  const pick = [...st.indicators].sort((a, b) => rank(b.status) - rank(a.status))[0]
  const values = pick.series.filter((p) => p.actual !== null).map((p) => p.actual as number)
  const normal = pick.normal ? ` · normal ${fmt(pick.normal.low, pick.param)}–${fmt(pick.normal.high, pick.param)}` : ''
  return {
    label: `${pick.param.label}${normal}`.slice(0, 40),
    value: pick.latest?.actual != null ? String(pick.latest.actual) : '—',
    unit: pick.param.unit,
    spark: values.slice(-14),
  }
}

/** data cards in forecast mode (only systems with a long-term model) */
function forecastCards(points: ForecastPoint[], day: number): Partial<Record<SystemId, CardInfo>> {
  const upto = points.slice(0, day + 1).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 14)) === 0 || i === a.length - 1)
  const p = points[day]
  return {
    bones: { label: `Bone density · day ${p.day}`, value: String(p.bone), unit: '% pre-flight', spark: upto.map((x) => x.bone) },
    muscles: { label: `Muscle strength · day ${p.day}`, value: String(p.muscle), unit: '%', spark: upto.map((x) => x.muscle) },
    radiation: { label: `Total dose · career limit 600`, value: String(p.dose), unit: 'mSv', spark: upto.map((x) => x.dose) },
    eyes: { label: `Risk of vision change (SANS)`, value: String(p.sans), unit: '%', spark: upto.map((x) => x.sans) },
    immune: { label: `Immune resilience · day ${p.day}`, value: String(p.immune), unit: '%', spark: upto.map((x) => x.immune) },
  }
}
