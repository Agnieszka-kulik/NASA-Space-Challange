import { CREW, MISSION } from '../data/mockData'
import { LOCATIONS, formatCountdown, formatDelay, type LocationId } from '../data/locations'
import { remainingSec, useNow } from './useNow'
import type { SentMessage } from '../data/alerts'
import { STATUS_COLORS, getParam } from '../data/parameters'
import {
  INTENSITY,
  SCENARIOS,
  MISSION_LOCATION,
  getScenario,
  simParams,
  simWindow,
  type ImpactRow,
  type Intensity,
  type SimulationConfig,
} from '../data/simulation'

interface Props {
  open: boolean
  onToggle: () => void
  draft: SimulationConfig
  onDraftChange: (cfg: SimulationConfig) => void
  active: SimulationConfig | null
  results: ImpactRow[]
  onRun: () => void
  onStop: () => void
  onSendPlan: (rows: ImpactRow[]) => void
  onConsultEarth: () => void
  onSelectAstronaut: (id: string) => void
  /** last report sent to Earth from the simulator (for the countdown) */
  earthMessage: SentMessage | null
  timeScale: number
}

const sameConfig = (a: SimulationConfig | null, b: SimulationConfig) => a !== null && JSON.stringify(a) === JSON.stringify(b)

export default function ScenarioSimulator(props: Props) {
  const { open, onToggle, draft, onDraftChange, active, results, onRun, onStop, onSendPlan, onConsultEarth, onSelectAstronaut, earthMessage, timeScale } = props
  const now = useNow()
  const draftLoc = LOCATIONS[draft.locationId]
  const activeLoc = active ? LOCATIONS[active.locationId] : null
  const scenario = getScenario(draft.scenarioId)
  const running = active !== null
  const activeScenario = active ? getScenario(active.scenarioId) : null
  const dirty = running && !sameConfig(active, draft)
  const set = (patch: Partial<SimulationConfig>) => onDraftChange({ ...draft, ...patch })

  const atRisk = results.filter((r) => r.id !== 'station' && r.worst !== 'ok')
  const critical = results.filter((r) => r.worst === 'critical').length
  const warning = results.filter((r) => r.worst === 'warning').length
  const { start } = simWindow(draft)

  return (
    <section className={`sim ${running ? 'sim--running' : ''} ${open ? 'sim--open' : ''}`}>
      {/* ---------- header bar (always visible) ---------- */}
      <button className="sim__bar" onClick={onToggle} aria-expanded={open}>
        <span className="sim__icon">🔮</span>
        <span className="sim__title">
          Scenario simulator
          <small>Digital twin predictions · what-if analysis for the whole crew</small>
        </span>
        {running && activeScenario ? (
          <span className="sim__status sim__status--running">
            <span className="sim__dot" /> SIMULATION RUNNING · {activeScenario.icon} {activeScenario.title} ·{' '}
            {INTENSITY[active!.intensity].label.toLowerCase()} · {activeLoc!.name} · {critical} critical / {warning} warning predicted
          </span>
        ) : (
          <span className="sim__status">○ Idle — expand to run a what-if scenario</span>
        )}
        <span className="sim__chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="sim__body">
          {/* ---------- 1. scenario ---------- */}
          <div className="sim__col">
            <h3 className="sim__step">1 · Choose scenario</h3>
            <div className="sim__scenarios">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  className={`sim-card ${s.id === draft.scenarioId ? 'sim-card--on' : ''}`}
                  onClick={() => set({ scenarioId: s.id, duration: s.defaultDuration, countermeasures: [] })}
                >
                  <span className="sim-card__icon">{s.icon}</span>
                  <span>
                    <b>{s.title}</b>
                    <small>{s.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ---------- 2. parameters ---------- */}
          <div className="sim__col">
            <h3 className="sim__step">2 · Set parameters</h3>

            <div className="sim__field">
              <span>
                Mission location {draft.locationId === MISSION_LOCATION && <small>(current mission)</small>}
              </span>
              <div className="seg">
                {(Object.keys(LOCATIONS) as LocationId[]).map((k) => (
                  <button key={k} className={`seg__btn ${draft.locationId === k ? 'seg__btn--active' : ''}`} onClick={() => set({ locationId: k })} title={LOCATIONS[k].full}>
                    {LOCATIONS[k].name}
                  </button>
                ))}
              </div>
              <div className="sim__loc">
                <span>📡 Earth link <b>{formatDelay(draftLoc.delaySec)}</b> one-way{draftLoc.delayNote && <small> ({draftLoc.delayNote})</small>}</span>
                <span>Gravity <b>{draftLoc.gravity}</b></span>
                <span>Radiation <b>{draftLoc.radiation} mSv/d</b></span>
              </div>
            </div>

            <div className="sim__field">
              <span>Intensity</span>
              <div className="seg">
                {(Object.keys(INTENSITY) as Intensity[]).map((k) => (
                  <button key={k} className={`seg__btn ${draft.intensity === k ? 'seg__btn--active' : ''}`} onClick={() => set({ intensity: k })}>
                    {INTENSITY[k].label}
                  </button>
                ))}
              </div>
            </div>

            <label className="sim__field">
              <span>
                Starts in <b>{draft.startIn === 0 ? 'today' : `${draft.startIn} d`}</b> <small>(mission day {start})</small>
              </span>
              <input type="range" min={0} max={7} value={draft.startIn} onChange={(e) => set({ startIn: Number(e.target.value) })} />
            </label>

            <label className="sim__field">
              <span>
                Duration <b>{draft.duration} d</b>
              </span>
              <input type="range" min={1} max={10} value={draft.duration} onChange={(e) => set({ duration: Number(e.target.value) })} />
            </label>

            <div className="sim__field">
              <span>Countermeasures (prevention)</span>
              {scenario.countermeasures.map((c) => (
                <label key={c.id} className="sim__check">
                  <input
                    type="checkbox"
                    checked={draft.countermeasures.includes(c.id)}
                    onChange={(e) =>
                      set({
                        countermeasures: e.target.checked
                          ? [...draft.countermeasures, c.id]
                          : draft.countermeasures.filter((x) => x !== c.id),
                      })
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>

            <div className="sim__actions">
              <button className="sim__run" onClick={onRun} disabled={running && !dirty}>
                {running ? (dirty ? '↻ Re-run with new settings' : '✓ Simulation up to date') : '▶ Run simulation'}
              </button>
              {running && (
                <button className="sim__stop" onClick={onStop}>
                  ■ Stop
                </button>
              )}
            </div>
          </div>

          {/* ---------- 3. results ---------- */}
          <div className="sim__col sim__col--results">
            <h3 className="sim__step">3 · Predicted crew response</h3>
            {!running ? (
              <p className="empty">
                Run a simulation to see how each astronaut’s digital twin is predicted to react. Real measurements are never changed –
                predictions appear as a separate <span className="sim-text">violet line</span> on the charts.
              </p>
            ) : (
              <>
                <p className="sim__summary">
                  {atRisk.length === 0 ? (
                    <>✓ No astronaut is predicted to leave the safe range.</>
                  ) : (
                    <>
                      <b>{atRisk.length}</b> of {CREW.length} astronauts predicted to leave the safe range. Most at risk:{' '}
                      <b>{[...atRisk].sort((a, b) => (a.worst === 'critical' ? -1 : 1) - (b.worst === 'critical' ? -1 : 1))[0].name}</b>.
                    </>
                  )}
                </p>
                <div className="impact">
                  <table>
                    <thead>
                      <tr>
                        <th />
                        {simParams(active!).map((id) => (
                          <th key={id}>{getParam(id).label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.id}>
                          <th>
                            {r.id === 'station' ? (
                              'Station'
                            ) : (
                              <button className="impact__who" onClick={() => onSelectAstronaut(r.id)}>
                                {r.name}
                              </button>
                            )}
                          </th>
                          {simParams(active!).map((id) => {
                            const c = r.cells.find((x) => x.paramId === id)
                            if (!c) return <td key={id} className="impact__na">–</td>
                            return (
                              <td key={id} className={`impact__cell impact__cell--${c.status}`} title={c.firstBadDay ? `Crosses into ${c.status} on mission day ${c.firstBadDay}` : 'Stays in safe range'}>
                                <b style={{ color: c.status === 'ok' ? undefined : STATUS_COLORS[c.status] }}>
                                  {c.status === 'critical' ? '✖ ' : c.status === 'warning' ? '⚠ ' : ''}
                                  {c.peak.toFixed(getParam(id).decimals)}
                                </b>
                                {c.firstBadDay !== null && <small>day {c.firstBadDay}</small>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="impact__note">
                  Peak predicted value during/after the event (mission day {MISSION.currentDay} = today). Personal response depends on
                  each astronaut’s sensitivity and current condition.
                </p>
                <div className="sim__buttons">
                  {atRisk.length > 0 && (
                    <button className="sim__plan" onClick={() => onSendPlan(atRisk)}>
                      📨 Send preventive plan to at-risk crew ({atRisk.length})
                    </button>
                  )}
                  <button className="sim__plan sim__plan--earth" onClick={onConsultEarth}>
                    📡 Send report to flight surgeons on Earth
                  </button>
                </div>
                <EarthLink loc={activeLoc!} message={earthMessage} now={now} timeScale={timeScale} />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/** Shows how long a consultation with Earth would take at the simulated location */
function EarthLink({ loc, message, now, timeScale }: { loc: (typeof LOCATIONS)[LocationId]; message: SentMessage | null; now: number; timeScale: number }) {
  const oneWay = loc.delaySec
  const toEarth = message ? remainingSec(message.sentAt, message.delaySec, now, timeScale) : 0
  const reply = message ? remainingSec(message.sentAt, message.delaySec * 2, now, timeScale) : 0

  return (
    <div className={`earth ${oneWay > 60 ? 'earth--far' : ''}`}>
      <div className="earth__head">
        📡 Earth support at <b>{loc.name}</b>: one-way <b>{formatDelay(oneWay)}</b>, fastest possible answer <b>{formatDelay(oneWay * 2)}</b>
      </div>
      {message ? (
        <div className="earth__status">
          {toEarth > 0 ? (
            <>Report <b>arrives on Earth in {formatCountdown(toEarth)}</b> · earliest reply in {formatCountdown(reply)}</>
          ) : reply > 0 ? (
            <>✓ Report received on Earth · <b>earliest reply in {formatCountdown(reply)}</b></>
          ) : (
            <>✓ Report received · ✉ reply from flight surgeons could arrive now</>
          )}
        </div>
      ) : (
        <div className="earth__status earth__status--hint">
          {oneWay > 60
            ? 'Ground cannot respond in real time – the onboard Crew Medical Officer must act first.'
            : 'Near real-time contact – flight surgeons can support the crew live.'}
        </div>
      )}
    </div>
  )
}
