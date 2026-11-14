import { useState, useEffect } from 'react'
import { CREW, MISSION, type SeriesPoint } from '../data/mockData'
import { LOCATIONS, formatCountdown, formatDelay, type LocationId } from '../data/locations'
import { remainingSec, useNow } from './useNow'
import type { SentMessage } from '../data/alerts'
import { STATUS_COLORS, STATUS_LABELS, getParam } from '../data/parameters'
import {
  SCENARIOS,
  MISSION_LOCATION,
  getScenario,
  simParams,
  summarizeAtDay,
  type ImpactRow,
  type SimulationConfig,
} from '../data/simulation'

interface Props {
  open: boolean
  onToggle: () => void
  draft: SimulationConfig
  onDraftChange: (cfg: SimulationConfig) => void
  active: SimulationConfig | null
  results: ImpactRow[]
  simCrew: Record<string, Record<string, SeriesPoint[]>>
  simEnvironment: Record<string, SeriesPoint[]>
  onRun: () => void
  onStop: () => void
  onSendPlan: (rows: ImpactRow[]) => void
  onConsultEarth: () => void
  onSelectAstronaut: (id: string) => void
  /** last report sent to Earth from the simulator (for the countdown) */
  earthMessage: SentMessage | null
  /** all messages triggered from the simulator */
  simMessages?: SentMessage[]
  timeScale: number
  onTimeScale?: (scale: number) => void
}

const sameConfig = (a: SimulationConfig | null, b: SimulationConfig) =>
  a !== null &&
  a.scenarioId === b.scenarioId &&
  a.locationId === b.locationId &&
  a.duration === b.duration

export default function ScenarioSimulator(props: Props) {
  const {
    open,
    onToggle,
    draft,
    onDraftChange,
    active,
    simCrew,
    simEnvironment,
    onRun,
    onStop,
    onConsultEarth,
    onSelectAstronaut,
    earthMessage,
    timeScale,
  } = props

  const [scenarioDropdownOpen, setScenarioDropdownOpen] = useState(false)
  const [inspectedDay, setInspectedDay] = useState(1)
  const now = useNow()

  const draftLoc = LOCATIONS[draft.locationId]
  const activeLoc = active ? LOCATIONS[active.locationId] : draftLoc
  const scenario = getScenario(draft.scenarioId)
  const running = active !== null
  const activeScenario = active ? getScenario(active.scenarioId) : null
  const dirty = running && !sameConfig(active, draft)
  const set = (patch: Partial<SimulationConfig>) =>
    onDraftChange({ ...draft, startIn: 0, ...patch })

  const maxSimDays = active ? active.duration : draft.duration

  // Clamp inspectedDay whenever active duration changes
  useEffect(() => {
    if (active && inspectedDay > active.duration) {
      setInspectedDay(active.duration)
    }
  }, [active, inspectedDay])

  // Compute day-specific results for the currently selected slider day
  const dayResults: ImpactRow[] =
    running && active
      ? summarizeAtDay(active, simCrew, simEnvironment, inspectedDay)
      : []

  const crewRows = dayResults.filter((r) => r.id !== 'station')
  const atRisk = crewRows.filter((r) => r.worst !== 'ok')
  const criticalCount = crewRows.filter((r) => r.worst === 'critical').length
  const warningCount = crewRows.filter((r) => r.worst === 'warning').length
  const safeCount = crewRows.filter((r) => r.worst === 'ok').length

  const currentMissionDay = MISSION.currentDay + inspectedDay - 1

  return (
    <section className={`sim ${running ? 'sim--running' : ''} ${open ? 'sim--open' : ''}`}>
      {/* ---------- header bar (always visible) ---------- */}
      <button className="sim__bar" onClick={onToggle} aria-expanded={open}>
        <span className="sim__icon">🛰️</span>
        <span className="sim__title">
          Scenario simulator
          <small>Digital twin predictions · day-by-day what-if analysis for the whole crew</small>
        </span>
        {running && activeScenario ? (
          <span className="sim__status sim__status--running">
            <span className="sim__dot" /> SIMULATION RUNNING · {activeScenario.icon} {activeScenario.title} ·{' '}
            {activeLoc!.name} · {active!.duration} days · Day {inspectedDay}: {criticalCount} crit / {warningCount} warn
          </span>
        ) : (
          <span className="sim__status">○ Idle — expand to configure & run a what-if scenario</span>
        )}
        <span className="sim__chevron">{open ? '▴ Collapse' : '▾ Expand'}</span>
      </button>

      {open && (
        <div className="sim__body-2col">
          {/* =====================================================================
             LEFT COLUMN: 1. Collapsible Scenario Selector + 2. Location & Mission Duration
             ===================================================================== */}
          <div className="sim__left-col">
            {/* ---------- 1. Collapsible Scenario Picker ---------- */}
            <div className="sim-box">
              <div className="sim-box__head">
                <h3 className="sim__step">1 · Choose Scenario</h3>
                <span className="sim-box__badge">{SCENARIOS.length} presets</span>
              </div>

              <button
                type="button"
                className={`sim-selector-trigger ${scenarioDropdownOpen ? 'sim-selector-trigger--open' : ''}`}
                onClick={() => setScenarioDropdownOpen((v) => !v)}
              >
                <span className="sim-selector-trigger__icon">{scenario.icon}</span>
                <div className="sim-selector-trigger__info">
                  <div className="sim-selector-trigger__top">
                    <b>{scenario.title}</b>
                    <span className="sim-selector-trigger__action">
                      {scenarioDropdownOpen ? 'Hide ▴' : 'Change ▾'}
                    </span>
                  </div>
                  <small>{scenario.description}</small>
                </div>
              </button>

              {scenarioDropdownOpen && (
                <div className="sim-scenarios-drawer">
                  {SCENARIOS.map((s) => {
                    const isSelected = s.id === draft.scenarioId
                    return (
                      <button
                        type="button"
                        key={s.id}
                        className={`sim-card ${isSelected ? 'sim-card--on' : ''}`}
                        onClick={() => {
                          set({ scenarioId: s.id })
                          setScenarioDropdownOpen(false)
                        }}
                      >
                        <span className="sim-card__icon">{s.icon}</span>
                        <div className="sim-card__content">
                          <div className="sim-card__title-row">
                            <b>{s.title}</b>
                            {isSelected && <span className="sim-card__active-pill">Selected</span>}
                          </div>
                          <small>{s.description}</small>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ---------- 2. Simulation Parameters: ONLY Location & Mission Duration ---------- */}
            <div className="sim-box">
              <div className="sim-box__head">
                <h3 className="sim__step">2 · Set Parameters</h3>
              </div>

              <div className="sim__field">
                <div className="sim__field-label-row">
                  <span>Mission location</span>
                  {draft.locationId === MISSION_LOCATION && (
                    <small className="sim__tag-current">Current mission</small>
                  )}
                </div>
                <div className="seg seg--full">
                  {(Object.keys(LOCATIONS) as LocationId[]).map((k) => (
                    <button
                      type="button"
                      key={k}
                      className={`seg__btn ${draft.locationId === k ? 'seg__btn--active' : ''}`}
                      onClick={() => set({ locationId: k })}
                      title={LOCATIONS[k].full}
                    >
                      {LOCATIONS[k].name}
                    </button>
                  ))}
                </div>
                <div className="sim__loc-cards">
                  <div className="sim__loc-pill">
                    <span>📡 One-way</span>
                    <b>{formatDelay(draftLoc.delaySec)}</b>
                  </div>
                  <div className="sim__loc-pill">
                    <span>🪐 Gravity</span>
                    <b>{draftLoc.gravity}</b>
                  </div>
                  <div className="sim__loc-pill">
                    <span>☢️ Radiation</span>
                    <b>{draftLoc.radiation} mSv/d</b>
                  </div>
                </div>
              </div>

              <label className="sim__field sim__slider-card">
                <div className="sim__field-label-row">
                  <span>Mission duration</span>
                  <b className="sim__slider-val">{draft.duration} days</b>
                </div>
                <input
                  type="range"
                  className="hud-range-slider"
                  min={3}
                  max={30}
                  value={draft.duration}
                  onChange={(e) => set({ duration: Number(e.target.value) })}
                />
                <div className="sim__slider-ticks">
                  <span>3 d</span>
                  <span>15 d</span>
                  <span>30 d</span>
                </div>
              </label>

              <div className="sim__actions">
                <button
                  className="sim__run"
                  onClick={() => {
                    setInspectedDay(1)
                    onRun()
                  }}
                  disabled={running && !dirty}
                >
                  {running
                    ? dirty
                      ? '↻ Re-run simulation'
                      : '✓ Simulation Active'
                    : '▶ Run Simulation'}
                </button>
                {running && (
                  <button className="sim__stop" onClick={onStop}>
                    ■ Stop
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* =====================================================================
             RIGHT COLUMN: 3. Day Slider -> Table -> Bottom Row (Crew Counts + Compact Earth Comms)
             ===================================================================== */}
          <div className="sim__right-col">
            <div className="sim-box sim-box--results">
              <div className="sim-box__head">
                <h3 className="sim__step">3 · Predicted Crew & Station Response</h3>
              </div>

              {!running ? (
                <div className="sim-empty-state">
                  <div className="sim-empty-state__icon">🛰️</div>
                  <h4>Digital Twin Simulator is Ready</h4>
                  <p>
                    Choose a scenario, mission location, and mission duration on the left, then click <b>▶ Run Simulation</b> to inspect every astronaut’s parameters day by day.
                  </p>
                </div>
              ) : (
                <>
                  {/* Interactive Day-by-Day Scrubber Control (single uniform color) */}
                  <div className="sim-day-scrubber">
                    <div className="sim-day-scrubber__top">
                      <div className="sim-day-scrubber__title">
                        <span className="sim-day-scrubber__badge">🗓️ MISSION TIMELINE</span>
                        <strong>
                          Day {inspectedDay} <small>of {maxSimDays} (Mission day {currentMissionDay})</small>
                        </strong>
                      </div>
                      <div className="sim-day-scrubber__btns">
                        <button
                          type="button"
                          className="sim-day-step-btn"
                          disabled={inspectedDay <= 1}
                          onClick={() => setInspectedDay((d) => Math.max(1, d - 1))}
                        >
                          ◀ Prev
                        </button>
                        <button
                          type="button"
                          className="sim-day-step-btn"
                          disabled={inspectedDay >= maxSimDays}
                          onClick={() => setInspectedDay((d) => Math.min(maxSimDays, d + 1))}
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      className="hud-range-slider hud-range-slider--day"
                      min={1}
                      max={maxSimDays}
                      value={inspectedDay}
                      onChange={(e) => setInspectedDay(Number(e.target.value))}
                    />

                    <div className="sim__slider-ticks">
                      <span>Day 1</span>
                      <span>Day {Math.max(1, Math.round(maxSimDays / 2))}</span>
                      <span>Day {maxSimDays}</span>
                    </div>
                  </div>

                  {/* Compact, Clear Impact Matrix for the Selected Day */}
                  <div className="impact impact--large">
                    <table>
                      <thead>
                        <tr>
                          <th className="impact__th-who">Crew / Target</th>
                          <th className="impact__th-overall">Status (Day {inspectedDay})</th>
                          {simParams(active!).map((id) => {
                            const p = getParam(id)
                            const dir = p.thresholds.direction === 'high' ? '≥' : '≤'
                            return (
                              <th key={id} className="impact__th-param">
                                <div className="impact__param-name">
                                  {p.label} <span className="impact__param-unit">({p.unit})</span>
                                </div>
                                <div className="impact__param-limits">
                                  <span className="limit-warn">⚠ {dir}{p.thresholds.warning}</span>
                                  <span className="limit-crit">✖ {dir}{p.thresholds.critical}</span>
                                </div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {dayResults.map((r) => {
                          const memberObj = CREW.find((c) => c.id === r.id)
                          return (
                            <tr key={r.id} className={`impact__row impact__row--${r.worst}`}>
                              <th className="impact__who-cell">
                                {r.id === 'station' ? (
                                  <div className="impact__station-label">
                                    <span className="impact__who-icon">🛰️</span>
                                    <div>
                                      <b>Station Habitat</b>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="impact__who-btn"
                                    onClick={() => onSelectAstronaut(r.id)}
                                    title="Click to inspect this astronaut's charts below"
                                  >
                                    <span className="impact__who-icon">👨‍🚀</span>
                                    <div>
                                      <b>{r.name}</b>
                                      <small>{memberObj ? memberObj.role : ''}</small>
                                    </div>
                                  </button>
                                )}
                              </th>

                              <td className="impact__overall-cell">
                                <span className={`impact-status-pill impact-status-pill--${r.worst}`}>
                                  {STATUS_LABELS[r.worst]}
                                </span>
                              </td>

                              {simParams(active!).map((id) => {
                                const p = getParam(id)
                                const c = r.cells.find((x) => x.paramId === id)
                                if (!c) return <td key={id} className="impact__na">—</td>
                                return (
                                  <td
                                    key={id}
                                    className={`impact__cell impact__cell--${c.status}`}
                                  >
                                    <div className="impact__val-row">
                                      <b style={{ color: STATUS_COLORS[c.status] }}>
                                        {c.peak.toFixed(p.decimals)}
                                      </b>
                                      <span className="impact__val-unit">{p.unit}</span>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Row UNDER Table: Left = Crew Status Summary, Right = Compact Earth Report Dispatch */}
                  <div className="sim-bottom-bar">
                    <div className="sim-kpi-row">
                      <div className="sim-kpi-card sim-kpi-card--ok">
                        <span className="sim-kpi-card__label">SAFE (DAY {inspectedDay})</span>
                        <strong className="sim-kpi-card__val">{safeCount} / {CREW.length}</strong>
                      </div>
                      <div className="sim-kpi-card sim-kpi-card--warning">
                        <span className="sim-kpi-card__label">WARNING</span>
                        <strong className="sim-kpi-card__val">{warningCount}</strong>
                      </div>
                      <div className="sim-kpi-card sim-kpi-card--critical">
                        <span className="sim-kpi-card__label">CRITICAL</span>
                        <strong className="sim-kpi-card__val">{criticalCount}</strong>
                        {atRisk.length > 0 && (
                          <small>At risk: {atRisk.map((a) => a.name).join(', ')}</small>
                        )}
                      </div>
                    </div>

                    <CompactEarthDispatch
                      loc={activeLoc!}
                      earthMessage={earthMessage}
                      now={now}
                      timeScale={timeScale}
                      onConsultEarth={onConsultEarth}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Compact Side Box for Sending & Tracking Earth Consultation Reports
 */
function CompactEarthDispatch({
  loc,
  earthMessage,
  now,
  timeScale,
  onConsultEarth,
}: {
  loc: (typeof LOCATIONS)[LocationId]
  earthMessage: SentMessage | null
  now: number
  timeScale: number
  onConsultEarth: () => void
}) {
  const oneWay = loc.delaySec
  const toEarth = earthMessage ? remainingSec(earthMessage.sentAt, earthMessage.delaySec, now, timeScale) : 0
  const replyLeft = earthMessage ? remainingSec(earthMessage.sentAt, earthMessage.delaySec * 2, now, timeScale) : 0
  const totalWindow = earthMessage ? earthMessage.delaySec * 2 : 0
  const progressPct =
    !earthMessage || totalWindow === 0
      ? 0
      : Math.min(100, Math.max(5, Math.round((1 - replyLeft / totalWindow) * 100)))

  let statusText = `One-way: ${formatDelay(oneWay)} · Reply: ${formatDelay(oneWay * 2)}`
  let badgeText = 'Ready'
  let statusClass = 'idle'

  if (earthMessage) {
    if (toEarth > 0) {
      badgeText = `🚀 In transit (${formatCountdown(toEarth)})`
      statusText = `Arrives on Earth in ${formatCountdown(toEarth)} · Reply in ${formatCountdown(replyLeft)}`
      statusClass = 'transit'
    } else if (replyLeft > 0) {
      badgeText = `📥 Delivered · Reply in ${formatCountdown(replyLeft)}`
      statusText = `Received on Earth · Flight surgeons' reply in ${formatCountdown(replyLeft)}`
      statusClass = 'waiting'
    } else {
      badgeText = '✅ Delivered & Reply Ready'
      statusText = 'Consultation report delivered & reply received.'
      statusClass = 'delivered'
    }
  }

  return (
    <div className={`sim-earth-side sim-earth-side--${statusClass}`}>
      <div className="sim-earth-side__top">
        <span className="sim-earth-side__title">📡 Earth Link ({loc.name})</span>
        <span className={`sim-msg-status-pill sim-msg-status-pill--${statusClass === 'idle' ? 'waiting' : statusClass}`}>
          {badgeText}
        </span>
      </div>

      <div className="sim-earth-side__sub">{statusText}</div>

      {earthMessage && (
        <div className="sim-msg-progress-track">
          <div
            className={`sim-msg-progress-fill sim-msg-progress-fill--${statusClass === 'idle' ? 'waiting' : statusClass}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <button
        type="button"
        className="sim__plan sim__plan--earth sim-earth-side__btn"
        onClick={onConsultEarth}
      >
        📡 Send Report to Earth ({formatDelay(oneWay)})
      </button>
    </div>
  )
}
