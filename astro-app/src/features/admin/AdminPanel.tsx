import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SpaceBackground from '../../shared/components/SpaceBackground'
import ParameterPicker from './components/ParameterPicker'
import CrewVitals from './components/CrewVitals'
import TrendChart, { ChartLegend, ChartStatusBadge } from './components/TrendChart'
import { DEFAULT_SELECTED, PARAMETERS, STATUS_LABELS, worstStatus } from './data/parameters'
import { CREW, MISSION, generateAstronautSeries, generateEnvironment, latestStatus } from './data/mockData'
import './AdminPanel.css'

export default function AdminPanel() {
  const [selectedParams, setSelectedParams] = useState<string[]>(DEFAULT_SELECTED)
  const [astronautId, setAstronautId] = useState(CREW[0].id)
  const [seed, setSeed] = useState(42)

  const astronaut = CREW.find((c) => c.id === astronautId)!
  const astronautParams = PARAMETERS.filter((p) => p.category === 'astronaut' && selectedParams.includes(p.id))
  const envParams = PARAMETERS.filter((p) => p.category === 'environment' && selectedParams.includes(p.id))

  const environment = useMemo(() => generateEnvironment(seed), [seed])
  // series for the whole crew (needed for the status on every card)
  const crewSeries = useMemo(
    () => Object.fromEntries(CREW.map((m) => [m.id, generateAstronautSeries(m, seed)])),
    [seed],
  )
  const trendStatus = useMemo(
    () =>
      Object.fromEntries(
        CREW.map((m) => [m.id, worstStatus(Object.values(crewSeries[m.id]).map(latestStatus))]),
      ),
    [crewSeries],
  )
  const astronautSeries = crewSeries[astronaut.id]
  const astronautStatus = trendStatus[astronaut.id]

  const toggleParam = (id: string) =>
    setSelectedParams((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  return (
    <SpaceBackground>
      <div className="admin">
        <header className="admin__header">
          <Link to="/" className="admin__back">← Back</Link>
          <h1>Mission Control · Admin</h1>
          <div className="admin__mission">
            Mission <b>{MISSION.name}</b> · day <b>{MISSION.currentDay}</b> / {MISSION.lengthDays}
          </div>
          <button className="admin__btn" onClick={() => setSeed(Math.floor(Math.random() * 100000))}>
            ⟳ Generate new data (mock)
          </button>
        </header>

        <div className="admin__grid">
          <ParameterPicker selected={selectedParams} onToggle={toggleParam} />

          <div className="admin__middle">
            <CrewVitals selectedId={astronautId} onSelect={setAstronautId} trendStatus={trendStatus} />

            <section className="panel">
              <h2 className="panel__title">Station environment</h2>
              <ChartLegend />
              {envParams.length === 0 && <p className="empty">Select environment parameters on the left.</p>}
              <div className="env-grid">
                {envParams.map((p) => (
                  <div key={p.id} className={`chart-card chart-card--${latestStatus(environment[p.id])}`}>
                    <h3>
                      {p.label} <span>{p.unit}</span>
                      <ChartStatusBadge data={environment[p.id]} />
                    </h3>
                    <TrendChart param={p} data={environment[p.id]} height={120} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="panel admin__charts">
            <h2 className="panel__title">
              Astronaut parameters: <span className="accent">{astronaut.name}</span>
              <small> ({astronaut.role}, {astronaut.code}) — click a crew card to switch</small>
            </h2>
            {astronautStatus !== 'ok' && (
              <div className={`alert alert--${astronautStatus}`}>
                <b>{STATUS_LABELS[astronautStatus]}</b>
                <span>
                  {astronaut.name}'s recent measurements are outside the safe range:{' '}
                  {PARAMETERS.filter((p) => p.category === 'astronaut' && latestStatus(astronautSeries[p.id]) !== 'ok')
                    .map((p) => p.label)
                    .join(', ')}
                  .
                </span>
              </div>
            )}
            <ChartLegend />
            {astronautParams.length === 0 && <p className="empty">Select astronaut parameters on the left.</p>}
            <div className="trend-grid">
              {astronautParams.map((p) => (
                <div key={p.id} className={`chart-card chart-card--${latestStatus(astronautSeries[p.id])}`}>
                  <h3>
                    {p.label} <span>{p.unit}</span>
                    <ChartStatusBadge data={astronautSeries[p.id]} />
                  </h3>
                  <TrendChart param={p} data={astronautSeries[p.id]} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </SpaceBackground>
  )
}
