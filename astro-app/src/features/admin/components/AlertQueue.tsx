import { useState } from 'react'
import type { Alert, SentMessage } from '../data/alerts'
import { CREW, formatTimestamp } from '../data/mockData'
import { STATUS_COLORS, getParam } from '../data/parameters'
import { RECOMMENDATIONS, examText } from '../data/recommendations'
import { formatCountdown } from '../data/locations'
import { remainingSec, useNow } from './useNow'

interface Props {
  alerts: Alert[]
  acked: Set<string>
  messages: SentMessage[]
  timeScale: number
  selectedAstronautId: string
  onAck: (id: string) => void
  onSend: (alert: Alert, kind: 'recommendation' | 'exam', text: string) => void
  onSelectAstronaut: (id: string) => void
}

export default function AlertQueue(props: Props) {
  const { alerts, acked } = props
  const open = alerts.filter((a) => !acked.has(a.id))
  const handled = alerts.filter((a) => acked.has(a.id))
  const critical = open.filter((a) => a.status === 'critical').length
  const warning = open.length - critical

  return (
    <section className="panel alerts">
      <h2 className="panel__title">
        Medical alerts
        {critical > 0 && <span className="count count--critical">✖ {critical}</span>}
        {warning > 0 && <span className="count count--warning">⚠ {warning}</span>}
        {open.length === 0 && <span className="count count--ok">✓ all clear</span>}
      </h2>
      <div className="alerts__list">
        {[...open, ...handled].map((a) => (
          <AlertItem key={a.id} alert={a} {...props} />
        ))}
      </div>
    </section>
  )
}

function AlertItem({ alert, acked, messages, timeScale, selectedAstronautId, onAck, onSend, onSelectAstronaut }: Props & { alert: Alert }) {
  const [openRecs, setOpenRecs] = useState(false)
  const [choice, setChoice] = useState(0)
  const now = useNow()

  const param = getParam(alert.paramId)
  const member = CREW.find((c) => c.id === alert.astronautId)
  const isAcked = acked.has(alert.id)
  const recs = RECOMMENDATIONS[alert.paramId] ?? []
  const last = messages.filter((m) => m.alertId === alert.id).at(-1)
  const lastRemaining = last ? remainingSec(last.sentAt, last.delaySec, now, timeScale) : 0
  const threshold = param.thresholds[alert.status]
  const sign = param.thresholds.direction === 'high' ? '≥' : '≤'

  return (
    <div
      className={`alert-item alert-item--${alert.status} ${isAcked ? 'alert-item--acked' : ''} ${
        member && member.id === selectedAstronautId ? 'alert-item--selected' : ''
      }`}
    >
      <div className="alert-item__top">
        <span className="alert-item__sev" style={{ color: STATUS_COLORS[alert.status] }}>
          {alert.status === 'critical' ? '✖' : '⚠'}
        </span>
        {member ? (
          <button className="alert-item__who" onClick={() => onSelectAstronaut(member.id)} title="Show this astronaut's charts">
            {member.name.toUpperCase()}
          </button>
        ) : (
          <span className="alert-item__who alert-item__who--station">STATION · ALL CREW</span>
        )}
        {alert.timestamp && <span className="alert-item__time">{formatTimestamp(alert.timestamp)}</span>}
      </div>

      <div className="alert-item__what">
        {param.label}: <b style={{ color: STATUS_COLORS[alert.status] }}>{alert.value} {param.unit}</b>
        <span className="alert-item__limit">
          {' '}({alert.status} {sign} {threshold})
        </span>
      </div>

      {last && (
        <div className="alert-item__sent">
          {last.kind === 'exam' ? '🩺 Exam ordered' : '💬 Recommendation sent'} ·{' '}
          {lastRemaining > 0 ? <span className="in-transit">⏳ arrives in {formatCountdown(lastRemaining)}</span> : <span className="delivered">✓ delivered</span>}
        </div>
      )}

      {!isAcked && (
        <div className="alert-item__actions">
          <button onClick={() => onAck(alert.id)} title="Mark as seen">✓ Ack</button>
          {recs.length > 0 && (
            <button className={openRecs ? 'is-open' : ''} onClick={() => setOpenRecs((o) => !o)}>
              💬 Recommend
            </button>
          )}
          {member && (
            <button onClick={() => onSend(alert, 'exam', examText(param.label))} title="Ask the astronaut to re-measure now">
              🩺 Exam
            </button>
          )}
        </div>
      )}

      {openRecs && !isAcked && (
        <div className="alert-item__recs">
          {recs.map((r, i) => (
            <label key={r} className="rec">
              <input type="radio" name={`rec-${alert.id}`} checked={choice === i} onChange={() => setChoice(i)} />
              <span>{r}</span>
            </label>
          ))}
          <button
            className="rec__send"
            onClick={() => {
              onSend(alert, 'recommendation', recs[choice])
              setOpenRecs(false)
            }}
          >
            Send to {member ? member.name : 'all crew'} →
          </button>
        </div>
      )}
    </div>
  )
}
