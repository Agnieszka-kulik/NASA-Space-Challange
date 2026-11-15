import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { generateLiveVitals, type CrewMember, type LiveVitals, type SeriesPoint } from '../data/mockData'
import { STATUS_COLORS, STATUS_LABELS, getParam, getStatus, worstStatus, type Status } from '../data/parameters'
import CrewAvatar from './CrewAvatar'

interface Props {
  member: CrewMember
  series: Record<string, SeriesPoint[]>
  status: Status
  /** text of the button under the mini twin */
  ctaLabel?: string
}

const ECG_BEAT = 'l12 0 l3 -4 l3 4 l4 0 l2 3 l3 -22 l3 26 l2 -7 l6 0 l4 -5 l4 5 l14 0'
const ecgPath = `M0 20 ${Array(8).fill(ECG_BEAT).join(' ')}`

/** latest measured value of a series */
const latest = (s: SeriesPoint[] | undefined) => [...(s ?? [])].reverse().find((p) => p.actual !== null)?.actual ?? null

// live (smartwatch) values + latest logged values shown in the profile
const LIVE = [
  { key: 'heartRate', label: 'Heart rate', unit: 'BPM', icon: '❤' },
  { key: 'spo2', label: 'SpO₂', unit: '%', icon: '🫁' },
  { key: 'temperature', label: 'Temp', unit: '°C', icon: '🌡' },
] as const
const LOGGED = [
  { key: 'bloodPressure', label: 'BP (sys)', unit: 'mmHg', icon: '🩸' },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL', icon: '🧪' },
  { key: 'sleep', label: 'Sleep', unit: 'h', icon: '🌙' },
  { key: 'stress', label: 'Stress', unit: '/100', icon: '⚡' },
  { key: 'mood', label: 'Mood', unit: '/5', icon: '🙂' },
  { key: 'boneDensity', label: 'Bone', unit: '%', icon: '🦴' },
]

// body regions of the mini twin and the parameters that drive their colour
const REGIONS: { id: string; label: string; params: string[]; cx: number; cy: number }[] = [
  { id: 'brain', label: 'Brain & behaviour', params: ['stress', 'mood', 'sleep', 'fatigue', 'memory', 'reflex'], cx: 50, cy: 20 },
  { id: 'lungs', label: 'Lungs', params: ['spo2'], cx: 42, cy: 62 },
  { id: 'heart', label: 'Heart', params: ['heartRate', 'bloodPressure'], cx: 55, cy: 64 },
  { id: 'metabolism', label: 'Metabolism', params: ['glucose', 'temperature'], cx: 50, cy: 88 },
  { id: 'bones', label: 'Bones', params: ['boneDensity'], cx: 43, cy: 140 },
]

export default function AstronautProfile({ member, series, status, ctaLabel = 'Open 3D twin →' }: Props) {
  const [live, setLive] = useState<LiveVitals>(() => generateLiveVitals(member))

  useEffect(() => {
    setLive(generateLiveVitals(member))
    const t = setInterval(() => setLive(generateLiveVitals(member)), 2000)
    return () => clearInterval(t)
  }, [member])

  // fixed ECG speed per astronaut, so the trace scrolls smoothly
  const ecgSpeed = useMemo(() => (60 / generateLiveVitals(member).heartRate) * 4, [member])

  const regionStatus = (params: string[]) =>
    worstStatus(params.map((id) => getStatus(getParam(id), latest(series[id]))))

  return (
    <div className="profile">
      <div className={`profile__card profile__card--${status}`}>
        <div className="profile__head">
          <div className="profile__photo">
            <CrewAvatar member={member} />
          </div>
          <div className="profile__id">
            <strong>{member.name.toUpperCase()}</strong>
            <span>{member.role}</span>
            <span className="crew__code">{member.code}</span>
            <span className={`profile__status profile__status--${status}`}>{STATUS_LABELS[status]}</span>
          </div>
        </div>

        <svg className="profile__ecg" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d={ecgPath} style={{ animationDuration: `${ecgSpeed}s`, stroke: STATUS_COLORS[status] }} />
        </svg>

        <div className="profile__live">
          {LIVE.map(({ key, label, unit, icon }) => {
            const s = getStatus(getParam(key), live[key])
            return (
              <div key={key} className={`profile__big profile__big--${s}`}>
                <span className="profile__big-label">
                  {icon} {label} <i className="profile__live-dot">live</i>
                </span>
                <b>{live[key]}</b>
                <small>{unit}</small>
              </div>
            )
          })}
        </div>

        <div className="profile__logged">
          {LOGGED.map(({ key, label, unit, icon }) => {
            const v = latest(series[key])
            const s = getStatus(getParam(key), v)
            return (
              <div key={key} className={`profile__small profile__small--${s}`} title={getParam(key).label}>
                <span>
                  {icon} {label}
                </span>
                <b>
                  {v ?? '—'}
                  <small> {unit}</small>
                </b>
              </div>
            )
          })}
        </div>
      </div>

      <Link to={`/twin/${member.id}`} className="mini-twin" title={`Open ${member.name}'s digital twin`}>
        <span className="mini-twin__title">🧬 Digital twin</span>
        <svg className="mini-twin__svg" viewBox="0 0 100 200" aria-hidden="true">
          <defs>
            <radialGradient id="mini-twin-floor" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#00f5d4" stopOpacity="0.55" />
              <stop offset="1" stopColor="#00f5d4" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="192" rx="34" ry="6" fill="url(#mini-twin-floor)" />
          <ellipse className="mini-twin__ring" cx="50" cy="192" rx="28" ry="4.5" />
          <g className="mini-twin__body">
            {/* head */}
            <circle cx="50" cy="20" r="11" />
            {/* torso + arms + legs */}
            <path d="M44 31 L56 31 L57 37 Q70 39 72 47 L78 92 Q79 98 75 99 L71 98 L66 56 L64 96 L61 100 L62 136 L60 180 Q59 186 53 185 L52 140 L50 112 L48 140 L47 185 Q41 186 40 180 L38 136 L39 100 L36 96 L34 56 L29 98 L25 99 Q21 98 22 92 L28 47 Q30 39 43 37 Z" />
            {/* spine / center line */}
            <line x1="50" y1="33" x2="50" y2="108" className="mini-twin__spine" />
            {/* organs */}
            {REGIONS.map((r) => {
              const s = regionStatus(r.params)
              return (
                <g key={r.id}>
                  <title>{`${r.label}: ${STATUS_LABELS[s]}`}</title>
                  <circle
                    className={`mini-twin__organ mini-twin__organ--${s}`}
                    cx={r.cx}
                    cy={r.cy}
                    r={r.id === 'brain' ? 6 : 4.5}
                    fill={STATUS_COLORS[s]}
                  />
                  {r.id === 'bones' && (
                    <circle className={`mini-twin__organ mini-twin__organ--${s}`} cx={57} cy={140} r={4.5} fill={STATUS_COLORS[s]} />
                  )}
                </g>
              )
            })}
          </g>
          <rect className="mini-twin__scan" x="14" y="0" width="72" height="3" />
        </svg>
        <span className="mini-twin__cta">{ctaLabel}</span>
      </Link>
    </div>
  )
}