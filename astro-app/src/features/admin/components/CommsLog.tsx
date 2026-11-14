import type { SentMessage } from '../data/alerts'
import { formatCountdown } from '../data/locations'
import { remainingSec, useNow } from './useNow'

interface Props {
  messages: SentMessage[]
  timeScale: number
  onTimeScale: (scale: number) => void
}

const ICONS: Record<SentMessage['kind'], string> = { recommendation: '💬', exam: '🩺', scenario: '📢', earth: '📡' }

export default function CommsLog({ messages, timeScale }: Props) {
  const now = useNow()

  return (
    <section className="panel comms">
      <h2 className="panel__title">
        Comms log
      </h2>
      {messages.length === 0 && <p className="empty">No messages sent yet. Use “Recommend” or “Exam” on an alert. Onboard messages reach the crew instantly; reports to Earth take as long as the signal travels.</p>}
      <ul className="comms__list">
        {[...messages].reverse().map((m) => {
          const left = remainingSec(m.sentAt, m.delaySec, now, timeScale)
          const reply = m.replyExpected ? remainingSec(m.sentAt, m.delaySec * 2, now, timeScale) : 0
          const progress = m.delaySec === 0 ? 1 : 1 - left / m.delaySec
          return (
            <li key={m.id} className={`comms__item ${m.sim ? 'comms__item--sim' : ''}`}>
              <div className="comms__head">
                <span>
                  {ICONS[m.kind]} To <b>{m.to}</b> {m.sim && <span className="sim-tag">SIM</span>}
                </span>
                {left > 0 ? (
                  <span className="in-transit">⏳ arrives in {formatCountdown(left)}</span>
                ) : reply > 0 ? (
                  <span className="in-transit">✓ received · reply ≥ {formatCountdown(reply)}</span>
                ) : (
                  <span className="delivered">✓ delivered</span>
                )}
              </div>
              <p className="comms__text">{m.text}</p>
              <div className="comms__bar">
                <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
