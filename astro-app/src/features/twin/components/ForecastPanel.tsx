import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ASSUMPTIONS,
  FORECAST_LIMITS,
  MISSION_PROFILES,
  firstDay,
  type Countermeasures,
  type ForecastPoint,
  type MissionProfileId,
} from '../../../shared/digitalTwin/forecast'
import { SOURCES } from '../../../shared/digitalTwin/knowledge'

interface Props {
  profile: MissionProfileId
  onProfile: (p: MissionProfileId) => void
  cm: Countermeasures
  onCm: (cm: Countermeasures) => void
  day: number
  onDay: (d: number) => void
  withCm: ForecastPoint[]
  without: ForecastPoint[]
  boneFactor: number
}

const CM_LABELS: { key: keyof Countermeasures; label: string; hint: string }[] = [
  { key: 'exercise', label: 'Exercise ≈ 2 h/day', hint: 'Resistance (ARED) + treadmill + cycle, as on the ISS' },
  { key: 'nutrition', label: 'Vitamin D + calcium, full meals', hint: 'No skipped meals, daily supplements' },
  { key: 'sleep', label: '8 h protected sleep', hint: 'Fixed sleep window, light therapy after waking' },
]

const fmtDay = (d: number | null) => (d === null ? 'never' : `day ${d}`)

export default function ForecastPanel({ profile, onProfile, cm, onCm, day, onDay, withCm, without, boneFactor }: Props) {
  const total = withCm.length - 1
  const p = withCm[Math.min(day, total)]
  const anyCm = cm.exercise || cm.nutrition || cm.sleep
  const chartData = withCm.filter((_, i) => i % 3 === 0 || i === total).map((x) => ({ day: x.day, bone: x.bone, boneNo: without[x.day].bone, dose: x.dose }))

  const rows = [
    { key: 'bone' as const, label: '🦴 Bone density', value: `${p.bone}%`, level: 'critical' as const },
    { key: 'muscle' as const, label: '💪 Muscle strength', value: `${p.muscle}%`, level: 'critical' as const },
    { key: 'dose' as const, label: '☢ Radiation dose', value: `${p.dose} mSv`, level: 'critical' as const },
    { key: 'sans' as const, label: '👁 Vision change risk (SANS)', value: `${p.sans}%`, level: 'critical' as const },
    { key: 'immune' as const, label: '🛡 Immune resilience', value: `${p.immune}%`, level: 'warning' as const },
  ]

  return (
    <section className="panel forecast">
      <h2 className="panel__title">
        🔭 Mission forecast <small>— what happens to my body over the whole mission?</small>
      </h2>

      <div className="forecast__controls">
        <div className="seg">
          {(Object.keys(MISSION_PROFILES) as MissionProfileId[]).map((k) => (
            <button key={k} className={`seg__btn ${profile === k ? 'seg__btn--active' : ''}`} onClick={() => onProfile(k)}>
              {MISSION_PROFILES[k].name}
            </button>
          ))}
        </div>
        <div className="cms">
          {CM_LABELS.map((c) => (
            <label key={c.key} className={`cm ${cm[c.key] ? 'cm--on' : ''}`} title={c.hint}>
              <input type="checkbox" checked={cm[c.key]} onChange={(e) => onCm({ ...cm, [c.key]: e.target.checked })} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <label className="slider">
        <span>
          Mission day <b>{p.day}</b> / {total} · <em>{p.phase}</em>
        </span>
        <input type="range" min={0} max={total} value={day} onChange={(e) => onDay(Number(e.target.value))} />
      </label>

      <div className="fc-rows">
        {rows.map((r) => {
          const withDay = firstDay(withCm, r.key, r.level)
          const noDay = firstDay(without, r.key, r.level)
          const lim = FORECAST_LIMITS[r.key]
          const v = p[r.key]
          const isHigh = r.key === 'dose' || r.key === 'sans'
          const st = isHigh ? (v >= lim.critical ? 'critical' : v >= lim.warning ? 'warning' : 'ok') : v <= lim.critical ? 'critical' : v <= lim.warning ? 'warning' : 'ok'
          return (
            <div key={r.key} className={`fc-row fc-row--${st}`}>
              <span className="fc-row__label">{r.label}</span>
              <b className="fc-row__value">{r.value}</b>
              <span className="fc-row__when">
                {r.level} limit: {anyCm && r.key !== 'dose' && r.key !== 'sans' ? (
                  <>
                    <s>{fmtDay(noDay)}</s> → <b>{fmtDay(withDay)}</b>
                  </>
                ) : (
                  <b>{fmtDay(withDay)}</b>
                )}
              </span>
            </div>
          )
        })}
      </div>

      <div className="fc-insight">
        {(() => {
          const no = firstDay(without, 'bone', 'critical')
          const yes = firstDay(withCm, 'bone', 'critical')
          if (!anyCm) return <>Turn on countermeasures above to see how much they help.</>
          if (no !== null && yes === null) return <>✅ Without countermeasures your bones would reach the critical level on <b>day {no}</b>. With them: <b>never during this mission</b>.</>
          if (no !== null && yes !== null && yes > no) return <>⏳ Countermeasures delay critical bone loss from <b>day {no}</b> to <b>day {yes}</b> – not enough for the full mission. Flight surgeons may add medication.</>
          return <>Your bones stay above the critical level in both cases on this mission.</>
        })()}
        {boneFactor > 1.15 && <> Your own scans show bone loss <b>{Math.round((boneFactor - 1) * 100)}% faster</b> than average – the forecast uses YOUR rate.</>}
      </div>

      <div className="fc-chart">
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="day" type="number" domain={[0, total]} tickCount={7} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis domain={[(min: number) => Math.floor(Math.min(min, 88) - 2), 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip contentStyle={{ background: '#06101a', border: '1px solid #4c1d95', fontSize: 12 }} />
            <ReferenceLine y={FORECAST_LIMITS.bone.warning} stroke="#f5b83d" strokeDasharray="4 4" />
            <ReferenceLine y={FORECAST_LIMITS.bone.critical} stroke="#ff5a5f" strokeDasharray="4 4" />
            <ReferenceLine x={day} stroke="#c084fc" label={{ value: `day ${day}`, fill: '#e9d5ff', fontSize: 10, position: 'insideTopLeft' }} />
            <Line dataKey="boneNo" name="Bone % – no countermeasures" stroke="#64748b" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line dataKey="bone" name="Bone % – your plan" stroke="#c084fc" dot={false} strokeWidth={2.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="ind__legend">
          <span><i className="sw sw--sim" /> bone density with your plan</span>
          <span><i className="sw sw--dash" /> no countermeasures</span>
        </div>
      </div>

      <details className="sources">
        <summary>Model assumptions & sources</summary>
        <ul>
          {ASSUMPTIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
          <li><a href={SOURCES.bone.url} target="_blank" rel="noreferrer">{SOURCES.bone.title}</a></li>
          <li><a href={SOURCES.radiation.url} target="_blank" rel="noreferrer">{SOURCES.radiation.title}</a></li>
          <li><a href={SOURCES.sans.url} target="_blank" rel="noreferrer">{SOURCES.sans.title}</a></li>
        </ul>
      </details>
    </section>
  )
}
