import { useEffect, useState } from 'react'
import { CREW, generateLiveVitals, liveVitalsStatus, type LiveVitals } from '../data/mockData'
import { STATUS_LABELS, getParam, getStatus, worstStatus, type Status } from '../data/parameters'
import CrewAvatar from './CrewAvatar'

interface Props {
  selectedId: string
  onSelect: (id: string) => void
  /** worst status from each astronaut's latest measurements (charts) */
  trendStatus: Record<string, Status>
}

// Path of one ECG "beat" (repeated and animated by shifting)
const ECG_BEAT = 'l12 0 l3 -4 l3 4 l4 0 l2 3 l3 -22 l3 26 l2 -7 l6 0 l4 -5 l4 5 l14 0'
const ecgPath = `M0 20 ${Array(8).fill(ECG_BEAT).join(' ')}`

const STAT_KEYS = [
  { key: 'heartRate', unit: 'BPM' },
  { key: 'spo2', unit: '% SpO₂' },
  { key: 'temperature', unit: '°C' },
] as const

export default function CrewVitals({ selectedId, onSelect, trendStatus }: Props) {
  const [vitals, setVitals] = useState<Record<string, LiveVitals>>(() =>
    Object.fromEntries(CREW.map((m) => [m.id, generateLiveVitals(m)])),
  )

  // "Live" refresh every 2 seconds (mock)
  useEffect(() => {
    const timer = setInterval(() => {
      setVitals(Object.fromEntries(CREW.map((m) => [m.id, generateLiveVitals(m)])))
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="panel">
      <h2 className="panel__title">
        Crew vital signs <span className="live-dot">● live</span>
      </h2>
      <div className="crew">
        {CREW.map((m) => {
          const v = vitals[m.id]
          const status = worstStatus([liveVitalsStatus(v), trendStatus[m.id] ?? 'ok'])
          return (
            <button
              key={m.id}
              className={`crew__card crew__card--${status} ${selectedId === m.id ? 'crew__card--active' : ''}`}
              onClick={() => onSelect(m.id)}
              title="Click to see this astronaut's charts"
            >
              <div className="crew__head">
                <CrewAvatar member={m} />
                <div className="crew__info">
                  <strong>{m.name.toUpperCase()}</strong>
                  <span>{m.role}</span>
                  <span className="crew__code">{m.code}</span>
                </div>
              </div>

              <svg className="crew__ecg" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                <path d={ecgPath} style={{ animationDuration: `${(60 / v.heartRate) * 4}s` }} />
              </svg>

              <div className="crew__stats">
                {STAT_KEYS.map(({ key, unit }) => {
                  const s = getStatus(getParam(key), v[key])
                  return (
                    <span key={key} className={`stat stat--${s}`}>
                      <b>{v[key]}</b> {unit}
                    </span>
                  )
                })}
              </div>
              <span className={`status status--${status}`}>{STATUS_LABELS[status]}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
