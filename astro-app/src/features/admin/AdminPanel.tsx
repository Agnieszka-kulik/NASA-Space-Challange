import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SpaceBackground from '../../shared/components/SpaceBackground'
import { newId, publish } from '../../shared/api/missionChannel'
import ParameterPicker from './components/ParameterPicker'
import CrewVitals from './components/CrewVitals'
import ScenarioSimulator from './components/ScenarioSimulator'
import AlertQueue from './components/AlertQueue'
import CommsLog from './components/CommsLog'
import TrendChart, { ChartLegend, ChartStatusBadge } from './components/TrendChart'
import { DEFAULT_SELECTED, PARAMETERS, STATUS_LABELS, worstStatus, type ParamDef } from './data/parameters'
import { CREW, MISSION, generateAstronautSeries, generateEnvironment, latestStatus, type SeriesPoint } from './data/mockData'
import { LOCATIONS } from './data/locations'
import { MISSION_LOCATION, getScenario, simulateAll, summarize, type ImpactRow, type SimulationConfig } from './data/simulation'
import { RECOMMENDATIONS } from './data/recommendations'
import { buildAlerts, type Alert, type SentMessage } from './data/alerts'
import './AdminPanel.css'

export default function AdminPanel() {
  const [selectedParams, setSelectedParams] = useState<string[]>(DEFAULT_SELECTED)
  const [astronautId, setAstronautId] = useState('a5')
  const [seed, setSeed] = useState(42)
  const [simOpen, setSimOpen] = useState(false)
  const [simDraft, setSimDraft] = useState<SimulationConfig>({
    scenarioId: 'sleep',
    intensity: 'moderate',
    duration: 14,
    startIn: 0,
    countermeasures: [],
    locationId: MISSION_LOCATION,
  })
  const [simActive, setSimActive] = useState<SimulationConfig | null>(null)
  const [acked, setAcked] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<SentMessage[]>([])
  const [timeScale, setTimeScale] = useState(1)

  // where the real mission is; the simulator can test other locations
  const location = LOCATIONS[MISSION_LOCATION]
  const astronaut = CREW.find((c) => c.id === astronautId)!
  const astronautParams = PARAMETERS.filter((p) => p.category === 'astronaut' && selectedParams.includes(p.id))
  const envParams = PARAMETERS.filter((p) => p.category === 'environment' && selectedParams.includes(p.id))

  // ---------- data (mock generator + location + active scenario) ----------
  // real (measured) data – never modified by the simulator
  const environment = useMemo(() => generateEnvironment(seed, location.radiation), [seed, location])
  const crewSeries = useMemo(() => Object.fromEntries(CREW.map((m) => [m.id, generateAstronautSeries(m, seed)])), [seed])
  const trendStatus = useMemo(
    () => Object.fromEntries(CREW.map((m) => [m.id, worstStatus(Object.values(crewSeries[m.id]).map(latestStatus))])),
    [crewSeries],
  )
  const alerts = useMemo(() => buildAlerts(crewSeries, environment), [crewSeries, environment])

  // digital twin predictions for the running simulation (used inside ScenarioSimulator)
  const simEnvironment = useMemo(() => simulateAll(environment, simActive), [environment, simActive])
  const simCrew = useMemo(
    () => Object.fromEntries(CREW.map((m) => [m.id, simulateAll(crewSeries[m.id], simActive, m)])),
    [crewSeries, simActive],
  )
  const simResults = useMemo<ImpactRow[]>(() => (simActive ? summarize(simActive, simCrew, simEnvironment) : []), [simActive, simCrew, simEnvironment])
  const astronautSeries = crewSeries[astronaut.id]
  const astronautStatus = trendStatus[astronaut.id]

  // ---------- actions ----------
  const toggleParam = (id: string) =>
    setSelectedParams((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  // the Crew Medical Officer is ON BOARD -> messages to the crew arrive instantly

  const sendForAlert = (alert: Alert, kind: 'recommendation' | 'exam', text: string) => {
    const member = CREW.find((c) => c.id === alert.astronautId)
    const sentAt = Date.now()
    const id = newId()
    setMessages((m) => [...m, { id, alertId: alert.id, kind, to: member ? member.name : 'All crew', text, sentAt, delaySec: 0 }])
    setAcked((s) => new Set(s).add(alert.id))
    publish({ type: kind, id, astronautId: member ? member.id : 'all', paramId: alert.paramId, text, sentAt, deliverAt: sentAt })
  }

  const sendPreventivePlan = (rows: ImpactRow[]) => {
    if (!simActive) return
    const scenario = getScenario(simActive.scenarioId)
    for (const r of rows) {
      const worstCell = [...r.cells].sort((x, y) => (y.status === 'critical' ? 1 : 0) - (x.status === 'critical' ? 1 : 0))[0]
      const tip = RECOMMENDATIONS[worstCell.paramId]?.[0] ?? ''
      const text = `Preventive plan for “${scenario.title}”: ${tip}`
      const sentAt = Date.now()
      const id = newId()
      setMessages((m) => [...m, { id, alertId: null, kind: 'recommendation', to: r.name, text, sentAt, delaySec: 0, sim: true }])
      publish({ type: 'recommendation', id, astronautId: r.id, paramId: worstCell.paramId, text, sentAt, deliverAt: sentAt })
    }
  }

  // consulting flight surgeons on Earth takes as long as the signal travels (simulated location)
  const consultEarth = () => {
    if (!simActive) return
    const loc = LOCATIONS[simActive.locationId]
    const scenario = getScenario(simActive.scenarioId)
    const atRisk = simResults.filter((r) => r.id !== 'station' && r.worst !== 'ok').map((r) => r.name)
    const text = `Simulation report: “${scenario.title}” at ${loc.name}. At-risk crew: ${atRisk.join(', ') || 'none'}. Requesting review of the preventive plan.`
    setMessages((m) => [
      ...m,
      { id: newId(), alertId: null, kind: 'earth', to: 'Flight surgeons (Earth)', text, sentAt: Date.now(), delaySec: loc.delaySec, sim: true, replyExpected: true },
    ])
  }
  const earthMessage = [...messages].reverse().find((m) => m.kind === 'earth') ?? null

  return (
    <SpaceBackground>
      <div className={`admin ${simActive ? 'admin--simulating' : ''}`}>
        <header className="admin__header">
          <Link to="/" className="admin__back">← Back</Link>
          <h1>Crew Medical Officer Console</h1>
          <div className="admin__mission">
            Mission <b>{MISSION.name}</b> · day <b>{MISSION.currentDay}</b> / {MISSION.lengthDays} · {location.full}
          </div>
          <button
            className="admin__btn"
            onClick={() => {
              setSeed(Math.floor(Math.random() * 100000))
              setAcked(new Set())
            }}
          >
            ⟳ Generate new data (mock)
          </button>
        </header>

        <ScenarioSimulator
          open={simOpen}
          onToggle={() => setSimOpen((o) => !o)}
          draft={simDraft}
          onDraftChange={setSimDraft}
          active={simActive}
          results={simResults}
          simCrew={simCrew}
          simEnvironment={simEnvironment}
          onRun={() => setSimActive({ ...simDraft, startIn: 0 })}
          onStop={() => setSimActive(null)}
          onSendPlan={sendPreventivePlan}
          onConsultEarth={consultEarth}
          onSelectAstronaut={setAstronautId}
          earthMessage={earthMessage}
          simMessages={messages.filter((m) => m.sim)}
          timeScale={timeScale}
          onTimeScale={setTimeScale}
        />


        <div className="admin__grid">
          <div className="admin__left">
            <AlertQueue
              alerts={alerts}
              acked={acked}
              messages={messages}
              timeScale={timeScale}
              selectedAstronautId={astronautId}
              onAck={(id) => setAcked((s) => new Set(s).add(id))}
              onSend={sendForAlert}
              onSelectAstronaut={setAstronautId}
            />
            <CommsLog messages={messages} timeScale={timeScale} onTimeScale={setTimeScale} />
          </div>

          <div className="admin__middle">
            <CrewVitals selectedId={astronautId} onSelect={setAstronautId} trendStatus={trendStatus} />

            <section className="panel">
              <h2 className="panel__title">Station environment</h2>
              <ParameterPicker category="environment" selected={selectedParams} onToggle={toggleParam} />
              <ChartLegend />
              {envParams.length === 0 && <p className="empty">Select environment parameters above.</p>}
              <div className="env-grid">
                {envParams.map((p) => (
                  <ChartCard key={p.id} param={p} data={environment[p.id]} height={120} />
                ))}
              </div>
            </section>
          </div>

          <section className="panel admin__charts">
            <h2 className="panel__title">
              Astronaut parameters: <span className="accent">{astronaut.name}</span>
              <small> ({astronaut.role}, {astronaut.code}) — click a crew card or alert to switch</small>
            </h2>
            {astronautStatus !== 'ok' && (
              <div className={`alert alert--${astronautStatus}`}>
                <b>{STATUS_LABELS[astronautStatus]}</b>
                <span>
                  {astronaut.name}'s latest measurements are outside the safe range:{' '}
                  {PARAMETERS.filter((p) => p.category === 'astronaut' && latestStatus(astronautSeries[p.id]) !== 'ok')
                    .map((p) => p.label)
                    .join(', ')}
                  .
                </span>
              </div>
            )}
            <ParameterPicker category="astronaut" selected={selectedParams} onToggle={toggleParam} />
            <ChartLegend />
            {astronautParams.length === 0 && <p className="empty">Select astronaut parameters above.</p>}
            <div className="trend-grid">
              {astronautParams.map((p) => (
                <ChartCard key={p.id} param={p} data={astronautSeries[p.id]} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </SpaceBackground>
  )
}

function ChartCard({
  param,
  data,
  height,
}: {
  param: ParamDef
  data: SeriesPoint[]
  height?: number
}) {
  return (
    <div className={`chart-card chart-card--${latestStatus(data)}`}>
      <h3>
        {param.label} <span>{param.unit}</span>
        {param.info && (
          <span className="info" title={param.info} aria-label={param.info}>
            ⓘ
          </span>
        )}
        <ChartStatusBadge data={data} />
      </h3>
      <TrendChart param={param} data={data} height={height} />
    </div>
  )
}
