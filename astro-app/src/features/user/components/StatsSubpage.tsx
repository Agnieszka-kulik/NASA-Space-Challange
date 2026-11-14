import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TodoSection } from './TodoAccordion'

export interface ChartSeries {
  name: string
  color: string
  data: number[]
}

export interface MoodLogEntry {
  id: string
  day: string
  time: string
  label: string
  emoji: string
  score: number
}

export function MultiLineChart({
  labels,
  series,
  maxY = 100,
  minY = 0,
  height = 185,
}: {
  labels: string[]
  series: ChartSeries[]
  maxY?: number
  minY?: number
  height?: number
}) {
  const width = 640
  const padLeft = 42
  const padRight = 20
  const padTop = 18
  const padBottom = 30
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const rangeY = Math.max(1, maxY - minY)

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(1, labels.length - 1)) * innerW
  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(val, maxY))
    return padTop + innerH - ((clamped - minY) / rangeY) * innerH
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Number((minY + t * rangeY).toFixed(rangeY <= 5 ? 1 : 0))
  )

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name} className="chart-legend__item">
            <span className="chart-legend__dot" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {yTicks.map((tick) => {
          const y = getY(tick)
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="rgba(148, 163, 184, 0.14)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgba(203, 213, 225, 0.7)"
                fontSize="10.5"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {labels.map((label, idx) => (
          <text
            key={`${label}-${idx}`}
            x={getX(idx)}
            y={height - 8}
            textAnchor="middle"
            fill="rgba(203, 213, 225, 0.72)"
            fontSize="10"
          >
            {label}
          </text>
        ))}

        {series.map((s) => {
          const pointsStr = s.data
            .map((v, i) => `${getX(i)},${getY(v)}`)
            .join(' ')
          return (
            <g key={s.name}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsStr}
              />
              {s.data.map((v, i) => (
                <circle
                  key={`${s.name}-${i}`}
                  cx={getX(i)}
                  cy={getY(v)}
                  r="3.8"
                  fill={s.color}
                  stroke="#071018"
                  strokeWidth="1.5"
                >
                  <title>{`${s.name} (${labels[i]}): ${v}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface CustomMeasurementConfig {
  id: string
  label: string
  icon: string
  unit: string
  norm: string
  friendlyTip: string
  minY: number
  maxY: number
  series: ChartSeries[]
}

interface StatsSubpageProps {
  moodHistory: MoodLogEntry[]
  sections: TodoSection[]
  waterGlasses: number
  waterGoal: number
}

export default function StatsSubpage({
  moodHistory,
  sections,
  waterGlasses,
  waterGoal,
}: StatsSubpageProps) {
  const [selectedMeasId, setSelectedMeasId] = useState<string>('temp')

  // Continuous live telemetry from Astronaut Smartwatch & Cabin Sensors
  const [watchHistory, setWatchHistory] = useState<{
    labels: string[]
    bpm: number[]
    spo2: number[]
    stress: number[]
    pulseRest: number
    sleepHours: number
  }>({
    labels: ['30s temu', '25s temu', '20s temu', '15s temu', '10s temu', '5s temu', 'Teraz'],
    bpm: [71, 72, 70, 73, 74, 72, 71],
    spo2: [98, 98, 99, 98, 98, 99, 98],
    stress: [26, 25, 27, 24, 25, 23, 24],
    pulseRest: 64,
    sleepHours: 7.5,
  })

  const [sensorHistory, setSensorHistory] = useState<{
    labels: string[]
    oxygen: number[]
    noise: number[]
    radiation: number[]
  }>({
    labels: ['30s temu', '25s temu', '20s temu', '15s temu', '10s temu', '5s temu', 'Teraz'],
    oxygen: [20.9, 20.9, 21.0, 20.9, 20.8, 20.9, 20.9],
    noise: [52, 54, 53, 55, 52, 51, 53],
    radiation: [0.42, 0.43, 0.42, 0.44, 0.43, 0.42, 0.43],
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nowStr = new Date().toLocaleTimeString('pl-PL', {
        minute: '2-digit',
        second: '2-digit',
      })

      setWatchHistory((prev) => {
        const lastBpm = prev.bpm[prev.bpm.length - 1]
        const nextBpm = Math.max(62, Math.min(92, lastBpm + Math.floor(Math.random() * 5) - 2))
        const nextSpo2 = Math.random() > 0.25 ? 98 : 99
        const lastStress = prev.stress[prev.stress.length - 1]
        const nextStress = Math.max(15, Math.min(60, lastStress + Math.floor(Math.random() * 3) - 1))

        return {
          ...prev,
          labels: [...prev.labels.slice(1), nowStr],
          bpm: [...prev.bpm.slice(1), nextBpm],
          spo2: [...prev.spo2.slice(1), nextSpo2],
          stress: [...prev.stress.slice(1), nextStress],
        }
      })

      setSensorHistory((prev) => {
        const nextO2 = Number((20.8 + Math.random() * 0.25).toFixed(1))
        const nextNoise = Math.round(50 + Math.random() * 6)
        const nextRad = Number((0.41 + Math.random() * 0.04).toFixed(2))

        return {
          labels: [...prev.labels.slice(1), nowStr],
          oxygen: [...prev.oxygen.slice(1), nextO2],
          noise: [...prev.noise.slice(1), nextNoise],
          radiation: [...prev.radiation.slice(1), nextRad],
        }
      })
    }, 3000)

    return () => window.clearInterval(interval)
  }, [])

  const findTaskVal = (taskId: string, fallback: number): number => {
    for (const sec of sections) {
      const t = sec.tasks.find((item) => item.id === taskId)
      if (t?.value) {
        const parsed = parseFloat(t.value.replace(',', '.'))
        if (!Number.isNaN(parsed)) return parsed
      }
    }
    return fallback
  }

  const latestTemp = findTaskVal('d-temp', 36.6)
  const latestHgb = findTaskVal('w-blood', 14.8)
  const latestMass = findTaskVal('w-mass', 74.2)
  const latestHearing = findTaskVal('s-hearing', 14)

  const measurementConfigs: CustomMeasurementConfig[] = [
    {
      id: 'temp',
      label: 'Temperatura ciała',
      icon: '🌡️',
      unit: '°C',
      norm: '36.1 – 37.2 °C',
      friendlyTip: 'Twoja temperatura jest idealna — organizm dobrze radzi sobie na stacji.',
      minY: 35.5,
      maxY: 38.0,
      series: [
        {
          name: 'Twoja temperatura (°C)',
          color: '#00f5d4',
          data: [36.5, 36.6, 36.7, 36.5, 36.6, 36.6, latestTemp],
        },
      ],
    },
    {
      id: 'bp',
      label: 'Ciśnienie krwi',
      icon: '🩸',
      unit: 'mmHg',
      norm: 'ok. 120/80 mmHg',
      friendlyTip: 'Ciśnienie masz równe i spokojne, dokładnie takie jak powinno być.',
      minY: 60,
      maxY: 150,
      series: [
        {
          name: 'Ciśnienie górne — skurczowe (mmHg)',
          color: '#38bdf8',
          data: [118, 121, 119, 122, 117, 120, 119],
        },
        {
          name: 'Ciśnienie dolne — rozkurczowe (mmHg)',
          color: '#a78bfa',
          data: [78, 80, 79, 82, 76, 78, 79],
        },
      ],
    },
    {
      id: 'weekly-lab',
      label: 'Badania krwi i moczu',
      icon: '🧪',
      unit: 'g/dL / pH',
      norm: 'Hgb 13.5–17.5 | pH 5.5–7.0',
      friendlyTip: 'Wyniki cotygodniowych badań laboratoryjnych wyglądają bardzo dobrze!',
      minY: 4,
      maxY: 18,
      series: [
        {
          name: 'Hemoglobina we krwi (g/dL)',
          color: '#f43f5e',
          data: [14.5, 14.6, 14.7, 14.6, 14.8, 14.7, latestHgb],
        },
        {
          name: 'Odczyn pH moczu',
          color: '#fbbf24',
          data: [6.2, 6.4, 6.1, 6.3, 6.5, 6.2, 6.3],
        },
      ],
    },
    {
      id: 'mass',
      label: 'Twoja waga',
      icon: '⚖️',
      unit: 'kg',
      norm: '73.0 – 76.0 kg',
      friendlyTip: 'Utrzymujesz stałą masę ciała — ćwiczenia i dieta działają świetnie.',
      minY: 70,
      maxY: 78,
      series: [
        {
          name: 'Twoja masa ciała (kg)',
          color: '#4ade80',
          data: [74.6, 74.5, 74.4, 74.3, 74.3, 74.2, latestMass],
        },
      ],
    },
    {
      id: 'sensory',
      label: 'Wzrok i słuch',
      icon: '👁️',
      unit: 'dB / %',
      norm: 'Słuch ≤ 20 dB | Wzrok 100%',
      friendlyTip: 'Twój wzrok i słuch nie wykazują żadnych oznak przemęczenia.',
      minY: 0,
      maxY: 110,
      series: [
        {
          name: 'Sprawność wzroku (%)',
          color: '#00f5d4',
          data: [100, 100, 98, 100, 100, 100, 100],
        },
        {
          name: 'Czułość słuchu (dB — im mniej, tym lepiej)',
          color: '#f59e0b',
          data: [14, 15, 13, 14, 15, 14, latestHearing],
        },
      ],
    },
    {
      id: 'training',
      label: 'Trening i minigierki',
      icon: '🏋️',
      unit: 'pkt / %',
      norm: '80 – 100%',
      friendlyTip: 'Twój refleks, pamięć i forma fizyczna idą w górę z każdym dniem!',
      minY: 40,
      maxY: 100,
      series: [
        {
          name: 'Wyniki z minigierek na refleks i pamięć (pkt)',
          color: '#38bdf8',
          data: [76, 80, 82, 85, 88, 90, 92],
        },
        {
          name: 'Wykonany plan treningowy (%)',
          color: '#00f5d4',
          data: [70, 80, 75, 90, 85, 95, 90],
        },
      ],
    },
  ]

  const activeMeas =
    measurementConfigs.find((m) => m.id === selectedMeasId) || measurementConfigs[0]
  const primaryData = activeMeas.series[0].data
  const avgVal = (primaryData.reduce((a, b) => a + b, 0) / primaryData.length).toFixed(1)
  const minVal = Math.min(...primaryData).toFixed(1)
  const maxVal = Math.max(...primaryData).toFixed(1)
  const latestVal = primaryData[primaryData.length - 1]

  const currentBpm = watchHistory.bpm[watchHistory.bpm.length - 1]
  const currentSpo2 = watchHistory.spo2[watchHistory.spo2.length - 1]
  const currentStress = watchHistory.stress[watchHistory.stress.length - 1]

  const currentO2 = sensorHistory.oxygen[sensorHistory.oxygen.length - 1]
  const currentNoise = sensorHistory.noise[sensorHistory.noise.length - 1]
  const currentRad = sensorHistory.radiation[sensorHistory.radiation.length - 1]

  const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Dziś']
  const recentMoodScores = moodHistory.slice(-7).map((m) => m.score * 20)
  const moodLabels = moodHistory.slice(-7).map((m) => m.day)

  return (
    <div className="user-subpage">
      <div className="user-subpage__top">
        <Link to="/user" className="user-back-btn">
          ← Wróć do swojego panelu
        </Link>
        <div className="live-telemetry-badges">
          <span className="live-badge">
            <span className="live-dot" /> Twój zegarek jest połączony (odczyt na żywo)
          </span>
          <span className="live-badge">
            <span className="live-dot" /> Czujniki w pomieszczeniu działają cały czas
          </span>
        </div>
      </div>

      <h1 className="user-subpage__title">Twoje Zdrowie, Wyniki i Samopoczucie</h1>
      <p className="user-subpage__subtitle">
        Tutaj możesz na spokojnie przejrzeć swoje wyniki z zegarka, sprawdzić powietrze i hałas wokół siebie oraz zobaczyć wykresy ze swoich codziennych pomiarów.
      </p>

      {/* SECTION 1: INTERACTIVE CUSTOM MEASUREMENTS EXPLORER */}
      <div className="hud-card stats-section-block">
        <div className="stats-section-block__header">
          <div>
            <h2 className="hud-section-title">
              📊 TWOJE POMIARY — WYBIERZ, CO CHCESZ SPRAWDZIĆ
            </h2>
            <p className="telemetry-bottom-card__sub">{activeMeas.friendlyTip}</p>
          </div>
          <span className="stats-live-tag">Zdrowy zakres: {activeMeas.norm}</span>
        </div>

        {/* Przyciski wyboru kategorii pomiaru */}
        <div className="measurement-selector-tabs">
          {measurementConfigs.map((cfg) => {
            const isActive = cfg.id === activeMeas.id
            return (
              <button
                key={cfg.id}
                type="button"
                className={`meas-tab-btn ${isActive ? 'meas-tab-btn--active' : ''}`}
                onClick={() => setSelectedMeasId(cfg.id)}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </button>
            )
          })}
        </div>

        {/* Kafelki statystyczne wybranego pomiaru */}
        <div className="watch-metrics-grid">
          <div className="metric-tile">
            <span className="metric-tile__label">Twój ostatni wynik</span>
            <div className="metric-tile__val" style={{ color: '#00f5d4' }}>
              {latestVal} <small>{activeMeas.unit}</small>
            </div>
            <span className="metric-tile__sub">Zapisany na Twojej liście zadań</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Średnio w tym tygodniu</span>
            <div className="metric-tile__val" style={{ color: '#38bdf8' }}>
              {avgVal} <small>{activeMeas.unit}</small>
            </div>
            <span className="metric-tile__sub">Wyniki utrzymują się równo</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Najmniej i najwięcej (7 dni)</span>
            <div className="metric-tile__val" style={{ color: '#a78bfa' }}>
              {minVal} – {maxVal} <small>{activeMeas.unit}</small>
            </div>
            <span className="metric-tile__sub">Bez gwałtownych skoków</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Zalecana norma dla Ciebie</span>
            <div className="metric-tile__val" style={{ color: '#4ade80', fontSize: '1.1rem' }}>
              {activeMeas.norm}
            </div>
            <span className="metric-tile__sub">Wszystko wygląda dobrze 👍</span>
          </div>
        </div>

        {/* Wykres wybranego pomiaru */}
        <MultiLineChart
          labels={days}
          minY={activeMeas.minY}
          maxY={activeMeas.maxY}
          height={195}
          series={activeMeas.series}
        />

        {/* Paski postępu realizacji wszystkich sekcji TODO */}
        <div className="section-completion-bars">
          {sections.map((sec) => {
            const done = sec.tasks.filter((t) => t.done).length
            const total = sec.tasks.length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <div key={sec.id} className="sec-stat-pill">
                <div className="sec-stat-pill__top">
                  <span>
                    {sec.icon} {sec.title}
                  </span>
                  <strong>
                    {done} z {total} gotowe ({pct}%)
                  </strong>
                </div>
                <div className="sec-stat-pill__bar">
                  <div className="sec-stat-pill__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 2: SMARTWATCH LIVE TELEMETRY */}
      <div className="hud-card stats-section-block">
        <div className="stats-section-block__header">
          <div>
            <h2 className="hud-section-title">⌚ CO POKAZUJE TWÓJ ZEGAREK (ODCZYTY NA ŻYWO)</h2>
            <p className="telemetry-bottom-card__sub">
              Zegarek sam mierzy Twoje parametry przez cały dzień — nie musisz nic wpisywać ręcznie.
            </p>
          </div>
          <span className="stats-live-tag">Aktualizowane co chwilę</span>
        </div>

        <div className="watch-metrics-grid">
          <div className="metric-tile">
            <span className="metric-tile__label">Bicie serca w tej chwili</span>
            <div className="metric-tile__val" style={{ color: '#00f5d4' }}>
              {currentBpm} <small>BPM</small>
            </div>
            <span className="metric-tile__sub">Spokojny, dobry rytm</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Natlenienie organizmu (SpO₂)</span>
            <div className="metric-tile__val" style={{ color: '#38bdf8' }}>
              {currentSpo2} <small>%</small>
            </div>
            <span className="metric-tile__sub">Organizm jest świetnie dotleniony</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Tętno podczas odpoczynku</span>
            <div className="metric-tile__val" style={{ color: '#a78bfa' }}>
              {watchHistory.pulseRest} <small>BPM</small>
            </div>
            <span className="metric-tile__sub">Twoje serce dobrze się regeneruje</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Poziom stresu</span>
            <div className="metric-tile__val" style={{ color: '#f59e0b' }}>
              {currentStress} <small>/ 100</small>
            </div>
            <span className="metric-tile__sub">Jesteś dziś całkiem zrelaksowany</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Ile spałeś ostatniej nocy</span>
            <div className="metric-tile__val" style={{ color: '#4ade80' }}>
              {watchHistory.sleepHours} <small>godz.</small>
            </div>
            <span className="metric-tile__sub">W tym 2h 15m głębokiego snu</span>
          </div>
        </div>

        <MultiLineChart
          labels={watchHistory.labels}
          maxY={110}
          minY={10}
          height={180}
          series={[
            { name: 'Natlenienie krwi SpO₂ (%)', color: '#38bdf8', data: watchHistory.spo2 },
            { name: 'Bicie serca (BPM)', color: '#00f5d4', data: watchHistory.bpm },
            { name: 'Poziom stresu (0-100)', color: '#f59e0b', data: watchHistory.stress },
          ]}
        />
      </div>

      {/* SECTION 3: CONTINUOUS CABIN SENSORS */}
      <div className="hud-card stats-section-block">
        <div className="stats-section-block__header">
          <div>
            <h2 className="hud-section-title">🏠 WARUNKI WOKÓŁ CIEBIE (CZUJNIKI NA POKŁADZIE)</h2>
            <p className="telemetry-bottom-card__sub">
              Czujniki w Twoim module działają bez przerwy i dbają o to, żebyś miał dobre powietrze i bezpieczne otoczenie.
            </p>
          </div>
          <span className="stats-live-tag">Wszystko w normie</span>
        </div>

        <div className="sensor-metrics-grid">
          <div className="metric-tile">
            <span className="metric-tile__label">Ilość tlenu w powietrzu</span>
            <div className="metric-tile__val" style={{ color: '#38bdf8' }}>
              {currentO2} <small>%</small>
            </div>
            <span className="metric-tile__sub">Świeże powietrze, lekko się oddycha</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Głośność w pomieszczeniu</span>
            <div className="metric-tile__val" style={{ color: '#fbbf24' }}>
              {currentNoise} <small>dB</small>
            </div>
            <span className="metric-tile__sub">Zwykły, cichy szum wentylacji</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile__label">Poziom promieniowania</span>
            <div className="metric-tile__val" style={{ color: '#f472b6' }}>
              {currentRad} <small>mSv/d</small>
            </div>
            <span className="metric-tile__sub">Osłony działają — jesteś bezpieczny</span>
          </div>
        </div>

        <MultiLineChart
          labels={sensorHistory.labels}
          maxY={80}
          minY={0}
          height={175}
          series={[
            { name: 'Głośność otoczenia (dB)', color: '#fbbf24', data: sensorHistory.noise },
            { name: 'Ilość tlenu (%)', color: '#38bdf8', data: sensorHistory.oxygen },
            {
              name: 'Promieniowanie (x100 mSv/d)',
              color: '#f472b6',
              data: sensorHistory.radiation.map((r) => Math.round(r * 100)),
            },
          ]}
        />
      </div>

      {/* SECTION 4: MOOD TRACKER & HYDRATION */}
      <div className="hud-card stats-section-block">
        <div>
          <h3 className="hud-section-title">😊 TWOJE SAMOPOCZUCIE, SEN I PICIE WODY (OSTATNI TYDZIEŃ)</h3>
          <p className="telemetry-bottom-card__sub">
            Zobacz, jak Twój humor zaznaczany w Mood Trackerze łączy się z tym, ile śpisz i ile pijesz wody.
          </p>
        </div>
        <MultiLineChart
          labels={moodLabels.length === 7 ? moodLabels : days}
          maxY={100}
          series={[
            {
              name: 'Twój nastrój z Mood Trackera (%)',
              color: '#00f5d4',
              data: recentMoodScores.length === 7 ? recentMoodScores : [60, 80, 60, 40, 80, 100, 80],
            },
            {
              name: 'Wypita woda (% dziennego celu)',
              color: '#38bdf8',
              data: [75, 88, 100, 75, 88, 100, Math.min(100, Math.round((waterGlasses / waterGoal) * 100))],
            },
            {
              name: 'Jakość snu z zegarka (%)',
              color: '#a78bfa',
              data: [82, 85, 79, 88, 90, 92, 89],
            },
          ]}
        />
        <div className="mood-history-log">
          <span className="mood-history-log__title">Jak się ostatnio czułeś (Twoje wpisy):</span>
          <div className="mood-history-chips">
            {moodHistory.slice(-6).reverse().map((entry) => (
              <span key={entry.id} className="mood-history-chip">
                {entry.emoji} <strong>{entry.label}</strong> ({entry.day}, {entry.time})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
