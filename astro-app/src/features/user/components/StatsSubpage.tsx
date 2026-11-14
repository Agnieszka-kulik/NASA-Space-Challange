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
    labels: ['30s ago', '25s ago', '20s ago', '15s ago', '10s ago', '5s ago', 'Now'],
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
    labels: ['30s ago', '25s ago', '20s ago', '15s ago', '10s ago', '5s ago', 'Now'],
    oxygen: [20.9, 20.9, 21.0, 20.9, 20.8, 20.9, 20.9],
    noise: [52, 54, 53, 55, 52, 51, 53],
    radiation: [0.42, 0.43, 0.42, 0.44, 0.43, 0.42, 0.43],
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
        const nowStr = new Date().toLocaleTimeString('en-US', {
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
    label: 'Body Temperature',
    icon: '🌡️',
    unit: '°C',
    norm: '36.1 – 37.2 °C',
    friendlyTip: 'Your temperature is right on target — your body is adapting well on the station.',
    minY: 35.5,
    maxY: 38.0,
    series: [
      {
        name: 'Your temperature (°C)',
        color: '#00f5d4',
        data: [36.5, 36.6, 36.7, 36.5, 36.6, 36.6, latestTemp],
      },
    ],
  },
  {
    id: 'bp',
    label: 'Blood Pressure',
    icon: '🩸',
    unit: 'mmHg',
    norm: 'approx. 120/80 mmHg',
    friendlyTip: 'Your blood pressure is steady and calm, right where it should be.',
    minY: 60,
    maxY: 150,
    series: [
      {
        name: 'Systolic — upper pressure (mmHg)',
        color: '#38bdf8',
        data: [118, 121, 119, 122, 117, 120, 119],
      },
      {
        name: 'Diastolic — lower pressure (mmHg)',
        color: '#a78bfa',
        data: [78, 80, 79, 82, 76, 78, 79],
      },
    ],
  },
  {
    id: 'weekly-lab',
    label: 'Blood & Urine Labs',
    icon: '🧪',
    unit: 'g/dL / pH',
    norm: 'Hgb 13.5–17.5 | pH 5.5–7.0',
    friendlyTip: 'Your weekly lab checkups look great!',
    minY: 4,
    maxY: 18,
    series: [
      {
        name: 'Blood Hemoglobin (g/dL)',
        color: '#f43f5e',
        data: [14.5, 14.6, 14.7, 14.6, 14.8, 14.7, latestHgb],
      },
      {
        name: 'Urine pH level',
        color: '#fbbf24',
        data: [6.2, 6.4, 6.1, 6.3, 6.5, 6.2, 6.3],
      },
    ],
  },
  {
    id: 'mass',
    label: 'Body Weight',
    icon: '⚖️',
    unit: 'kg',
    norm: '73.0 – 76.0 kg',
    friendlyTip: 'You are maintaining a stable body mass — your workouts and nutrition are paying off.',
    minY: 70,
    maxY: 78,
    series: [
      {
        name: 'Your body mass (kg)',
        color: '#4ade80',
        data: [74.6, 74.5, 74.4, 74.3, 74.3, 74.2, latestMass],
      },
    ],
  },
  {
    id: 'sensory',
    label: 'Vision & Hearing',
    icon: '👁️',
    unit: 'dB / %',
    norm: 'Hearing ≤ 20 dB | Vision 100%',
    friendlyTip: 'Your eyesight and hearing show zero signs of strain or fatigue.',
    minY: 0,
    maxY: 110,
    series: [
      {
        name: 'Visual acuity score (%)',
        color: '#00f5d4',
        data: [100, 100, 98, 100, 100, 100, 100],
      },
      {
        name: 'Hearing threshold (dB — lower is better)',
        color: '#f59e0b',
        data: [14, 15, 13, 14, 15, 14, latestHearing],
      },
    ],
  },
  {
    id: 'training',
    label: 'Workouts & Minigames',
    icon: '🏋️',
    unit: 'pts / %',
    norm: '80 – 100%',
    friendlyTip: 'Your reflexes, memory, and physical fitness are improving day by day!',
    minY: 40,
    maxY: 100,
    series: [
      {
        name: 'Reflex & memory minigame score (pts)',
        color: '#38bdf8',
        data: [76, 80, 82, 85, 88, 90, 92],
      },
      {
        name: 'Completed workout plan (%)',
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

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today']
const recentMoodScores = moodHistory.slice(-7).map((m) => m.score * 20)
const moodLabels = moodHistory.slice(-7).map((m) => m.day)

return (
  <div className="user-subpage">
    <div className="user-subpage__top">
      <Link to="/user" className="user-back-btn">
        ← Back to your panel
      </Link>
      <div className="live-telemetry-badges">
        <span className="live-badge">
          <span className="user-live-dot" /> Your watch is connected (live readings)
        </span>
        <span className="live-badge">
          <span className="user-live-dot" /> Cabin sensors are running continuously
        </span>
      </div>
    </div>

    <h1 className="user-subpage__title">Your Health, Results & Wellbeing</h1>
    <p className="user-subpage__subtitle">
      Here you can comfortably review your smartwatch readings, check the air and noise around you, and explore charts from your daily measurements.
    </p>

    {/* SECTION 1: INTERACTIVE CUSTOM MEASUREMENTS EXPLORER */}
    <div className="hud-card stats-section-block">
      <div className="stats-section-block__header">
        <div>
          <h2 className="hud-section-title">
            📊 YOUR MEASUREMENTS — PICK WHAT YOU WANT TO CHECK
          </h2>
          <p className="telemetry-bottom-card__sub">{activeMeas.friendlyTip}</p>
        </div>
        <span className="stats-live-tag">Healthy range: {activeMeas.norm}</span>
      </div>

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

      <div className="watch-metrics-grid">
        <div className="metric-tile">
          <span className="metric-tile__label">Your latest result</span>
          <div className="metric-tile__val" style={{ color: '#00f5d4' }}>
            {latestVal} <small>{activeMeas.unit}</small>
          </div>
          <span className="metric-tile__sub">Saved from your task checklist</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Average this week</span>
          <div className="metric-tile__val" style={{ color: '#38bdf8' }}>
            {avgVal} <small>{activeMeas.unit}</small>
          </div>
          <span className="metric-tile__sub">Your results are staying steady</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Lowest & highest (7 days)</span>
          <div className="metric-tile__val" style={{ color: '#a78bfa' }}>
            {minVal} – {maxVal} <small>{activeMeas.unit}</small>
          </div>
          <span className="metric-tile__sub">No sudden spikes</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Recommended range for you</span>
          <div className="metric-tile__val" style={{ color: '#4ade80', fontSize: '1.1rem' }}>
            {activeMeas.norm}
          </div>
          <span className="metric-tile__sub">Everything looks good 👍</span>
        </div>
      </div>

      <MultiLineChart
        labels={days}
        minY={activeMeas.minY}
        maxY={activeMeas.maxY}
        height={195}
        series={activeMeas.series}
      />

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
                  {done} of {total} done ({pct}%)
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
          <h2 className="hud-section-title">⌚ WHAT YOUR WATCH SHOWS (LIVE READINGS)</h2>
          <p className="telemetry-bottom-card__sub">
            Your watch automatically tracks your body all day — you don't need to enter any of this manually.
          </p>
        </div>
        <span className="stats-live-tag">Updated every few seconds</span>
      </div>

      <div className="watch-metrics-grid">
        <div className="metric-tile">
          <span className="metric-tile__label">Heart rate right now</span>
          <div className="metric-tile__val" style={{ color: '#00f5d4' }}>
            {currentBpm} <small>BPM</small>
          </div>
          <span className="metric-tile__sub">Calm, steady rhythm</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Blood oxygen (SpO₂)</span>
          <div className="metric-tile__val" style={{ color: '#38bdf8' }}>
            {currentSpo2} <small>%</small>
          </div>
          <span className="metric-tile__sub">Your body is well oxygenated</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Resting heart rate</span>
          <div className="metric-tile__val" style={{ color: '#a78bfa' }}>
            {watchHistory.pulseRest} <small>BPM</small>
          </div>
          <span className="metric-tile__sub">Your heart is recovering well</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Stress level</span>
          <div className="metric-tile__val" style={{ color: '#f59e0b' }}>
            {currentStress} <small>/ 100</small>
          </div>
          <span className="metric-tile__sub">You're quite relaxed today</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Sleep last night</span>
          <div className="metric-tile__val" style={{ color: '#4ade80' }}>
            {watchHistory.sleepHours} <small>hrs</small>
          </div>
          <span className="metric-tile__sub">Including 2h 15m of deep sleep</span>
        </div>
      </div>

      <MultiLineChart
        labels={watchHistory.labels}
        maxY={110}
        minY={10}
        height={180}
        series={[
          { name: 'Blood oxygen SpO₂ (%)', color: '#38bdf8', data: watchHistory.spo2 },
          { name: 'Heart rate (BPM)', color: '#00f5d4', data: watchHistory.bpm },
          { name: 'Stress level (0-100)', color: '#f59e0b', data: watchHistory.stress },
        ]}
      />
    </div>

    {/* SECTION 3: CONTINUOUS CABIN SENSORS */}
    <div className="hud-card stats-section-block">
      <div className="stats-section-block__header">
        <div>
          <h2 className="hud-section-title">🏠 CONDITIONS AROUND YOU (CABIN SENSORS)</h2>
          <p className="telemetry-bottom-card__sub">
            Sensors in your module run non-stop to make sure you have fresh air and a safe environment.
          </p>
        </div>
        <span className="stats-live-tag">All normal</span>
      </div>

      <div className="sensor-metrics-grid">
        <div className="metric-tile">
          <span className="metric-tile__label">Oxygen in the air</span>
          <div className="metric-tile__val" style={{ color: '#38bdf8' }}>
            {currentO2} <small>%</small>
          </div>
          <span className="metric-tile__sub">Fresh air, easy breathing</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Room noise level</span>
          <div className="metric-tile__val" style={{ color: '#fbbf24' }}>
            {currentNoise} <small>dB</small>
          </div>
          <span className="metric-tile__sub">Quiet background ventilation hum</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile__label">Radiation level</span>
          <div className="metric-tile__val" style={{ color: '#f472b6' }}>
            {currentRad} <small>mSv/d</small>
          </div>
          <span className="metric-tile__sub">Shielding active — you are safe</span>
        </div>
      </div>

      <MultiLineChart
        labels={sensorHistory.labels}
        maxY={80}
        minY={0}
        height={175}
        series={[
          { name: 'Ambient noise (dB)', color: '#fbbf24', data: sensorHistory.noise },
          { name: 'Oxygen level (%)', color: '#38bdf8', data: sensorHistory.oxygen },
          {
            name: 'Radiation (x100 mSv/d)',
            color: '#f472b6',
            data: sensorHistory.radiation.map((r) => Math.round(r * 100)),
          },
        ]}
      />
    </div>

    {/* SECTION 4: MOOD TRACKER & HYDRATION */}
    <div className="hud-card stats-section-block">
      <div>
        <h3 className="hud-section-title">😊 YOUR WELLBEING, SLEEP & WATER INTAKE (LAST 7 DAYS)</h3>
        <p className="telemetry-bottom-card__sub">
          See how the mood you log in the Mood Tracker connects with your sleep and daily hydration.
        </p>
      </div>
      <MultiLineChart
        labels={moodLabels.length === 7 ? moodLabels : days}
        maxY={100}
        series={[
          {
            name: 'Your mood from Mood Tracker (%)',
            color: '#00f5d4',
            data: recentMoodScores.length === 7 ? recentMoodScores : [60, 80, 60, 40, 80, 100, 80],
          },
          {
            name: 'Water intake (% of daily goal)',
            color: '#38bdf8',
            data: [75, 88, 100, 75, 88, 100, Math.min(100, Math.round((waterGlasses / waterGoal) * 100))],
          },
          {
            name: 'Sleep quality from watch (%)',
            color: '#a78bfa',
            data: [82, 85, 79, 88, 90, 92, 89],
          },
        ]}
      />
      <div className="mood-history-log">
        <span className="mood-history-log__title">How you've been feeling lately (your logs):</span>
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
