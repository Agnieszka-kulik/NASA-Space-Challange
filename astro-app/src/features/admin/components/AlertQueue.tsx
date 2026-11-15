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
  const [collapsed, setCollapsed] = useState(false)
  const [filterTab, setFilterTab] = useState<'all' | 'open' | 'acked'>('open')

  const open = alerts.filter((a) => !acked.has(a.id))
  const handled = alerts.filter((a) => acked.has(a.id))
  const critical = open.filter((a) => a.status === 'critical').length
  const warning = open.length - critical

  const visibleAlerts = filterTab === 'open' ? open : filterTab === 'acked' ? handled : [...open, ...handled]

  return (
    <section className={`panel alerts ${collapsed ? 'alerts--collapsed' : ''}`}>
      <div className="alerts__header">
        <div className="alerts__title-row">
          <button
            type="button"
            className="alerts__collapse"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand medical alerts' : 'Collapse medical alerts'}
          >
            <span className="alerts__chevron">{collapsed ? '▸' : '▾'}</span>
            <h2 className="panel__title alerts__panel-title">Medical alerts</h2>
          </button>
          <div className="alerts__counts">
            {critical > 0 && <span className="count count--critical">✖ {critical}</span>}
            {warning > 0 && <span className="count count--warning">⚠ {warning}</span>}
            {open.length === 0 && <span className="count count--ok">✓ All clear</span>}
          </div>
        </div>

        {!collapsed && (
          <div className="alerts__tabs">
            <button
              type="button"
              className={`alerts__tab ${filterTab === 'open' ? 'alerts__tab--active' : ''}`}
              onClick={() => setFilterTab('open')}
            >
              Active ({open.length})
            </button>
            <button
              type="button"
              className={`alerts__tab ${filterTab === 'acked' ? 'alerts__tab--active' : ''}`}
              onClick={() => setFilterTab('acked')}
            >
              Handled ({handled.length})
            </button>
            <button
              type="button"
              className={`alerts__tab ${filterTab === 'all' ? 'alerts__tab--active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({alerts.length})
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="alerts__list hud-custom-scroll">
          {visibleAlerts.length === 0 ? (
            <p className="empty">No alerts in this view.</p>
          ) : (
            visibleAlerts.map((a) => <AlertItem key={a.id} alert={a} {...props} />)
          )}
        </div>
      )}
    </section>
  )
}

function AlertItem({
  alert,
  acked,
  messages,
  timeScale,
  selectedAstronautId,
  onAck,
  onSend,
  onSelectAstronaut,
}: Props & { alert: Alert }) {
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
      className={`alert-item alert-item--compact alert-item--${alert.status} ${isAcked ? 'alert-item--acked' : ''} ${
        member && member.id === selectedAstronautId ? 'alert-item--selected' : ''
      }`}
    >
      {/* Row 1: severity + who + time */}
      <div className="alert-item__top">
        <span className={`alert-sev-pill alert-sev-pill--${alert.status}`}>
          {alert.status === 'critical' ? '✖ CRIT' : '⚠ WARN'}
        </span>
        {member ? (
          <button
            type="button"
            className="alert-item__who"
            onClick={() => onSelectAstronaut(member.id)}
            title="Show this astronaut's profile and charts"
          >
            {member.name.toUpperCase()}
          </button>
        ) : (
          <span className="alert-item__who alert-item__who--station">🛰️ STATION</span>
        )}
        {alert.timestamp && <span className="alert-item__time">{formatTimestamp(alert.timestamp)}</span>}
      </div>

      {/* Row 2: parameter, value, limit */}
      <div className="alert-item__line">
        <span className="alert-item__param-label">{param.label}</span>
        <strong className="alert-item__param-val" style={{ color: STATUS_COLORS[alert.status] }}>
          {alert.value}
          <small> {param.unit}</small>
        </strong>
        <span className="alert-item__limit">
          {sign} {threshold}
        </span>
      </div>

      {last && (
        <div className="alert-item__sent">
          <span>{last.kind === 'exam' ? '🩺 Exam ordered' : '💬 Advice sent'}</span>
          {lastRemaining > 0 ? (
            <span className="in-transit">⏳ {formatCountdown(lastRemaining)}</span>
          ) : (
            <span className="delivered">✓ delivered</span>
          )}
        </div>
      )}

      {/* Row 3: small actions */}
      {isAcked ? (
        <span className="alert-item__acked-tag">✓ Acknowledged</span>
      ) : (
        <div className="alert-item__actions">
          <button type="button" className="alert-btn alert-btn--ack" onClick={() => onAck(alert.id)} title="Acknowledge">
            ✓ Ack
          </button>
          {recs.length > 0 && (
            <button
              type="button"
              className={`alert-btn ${openRecs ? 'is-open' : ''}`}
              onClick={() => setOpenRecs((o) => !o)}
              title="Send a countermeasure"
            >
              💬 Advise {openRecs ? '▴' : '▾'}
            </button>
          )}
          {member && (
            <button
              type="button"
              className="alert-btn"
              onClick={() => onSend(alert, 'exam', examText(param.label))}
              title="Ask the astronaut to re-measure now"
            >
              🩺 Exam
            </button>
          )}
        </div>
      )}

      {openRecs && !isAcked && (
        <div className="alert-item__recs">
          {recs.map((r, i) => (
            <label key={r} className={`rec ${choice === i ? 'rec--selected' : ''}`}>
              <input type="radio" name={`rec-${alert.id}`} checked={choice === i} onChange={() => setChoice(i)} />
              <span>{r}</span>
            </label>
          ))}
          <button
            type="button"
            className="rec__send"
            onClick={() => {
              onSend(alert, 'recommendation', recs[choice])
              setOpenRecs(false)
            }}
          >
            📨 Send to {member ? member.name : 'all crew'} →
          </button>
        </div>
      )}
    </div>
  )
}