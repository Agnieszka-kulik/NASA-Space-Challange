import { useState } from 'react'
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STATUS_COLORS, STATUS_LABELS } from '../../admin/data/parameters'
import { explain, fmt, type IndicatorState } from '../../../shared/digitalTwin/model'
import { ML_PARAMS } from '../../../shared/digitalTwin/indicators'

interface Props {
  state: IndicatorState
  howTo?: string[]
  fromMl: boolean
  onLog: () => void
}

/** One health indicator: latest value vs YOUR normal + trend chart with the learned personal-normal band */
export default function IndicatorCard({ state, howTo, fromMl, onLog }: Props) {
  const [showHow, setShowHow] = useState(false)
  const { param, latest, previous, status } = state
  const isMl = ML_PARAMS.has(param.id)
  const canLog = !isMl && param.id !== 'radiationDose'

  const trend =
    latest?.actual != null && previous?.actual != null
      ? latest.actual > previous.actual
        ? '▲'
        : latest.actual < previous.actual
          ? '▼'
          : '•'
      : ''

  return (
    <div className={`ind ind--${status}`}>
      <div className="ind__head">
        <span className="ind__label">
          {param.label}
          {isMl && <span className={`ml-badge ${fromMl ? 'ml-badge--real' : ''}`}>{fromMl ? 'ML' : 'ML · demo values'}</span>}
        </span>
        <span className={`pill pill--${status}`}>{STATUS_LABELS[status]}</span>
      </div>

      <div className="ind__value">
        <b style={{ color: status === 'ok' ? undefined : STATUS_COLORS[status] }}>{latest?.actual ?? '—'}</b>
        <span className="ind__unit">{param.unit}</span>
        {trend && <span className="ind__trend">{trend}</span>}
        {state.normal && (
          <span className="ind__normal">
            your normal {fmt(state.normal.low, param)}–{fmt(state.normal.high, param)}
          </span>
        )}
      </div>
      <p className="ind__explain">{explain(state)}</p>

      <MiniChart state={state} />

      <div className="ind__actions">
        {howTo && howTo.length > 0 && (
          <button className="link-btn" onClick={() => setShowHow((s) => !s)}>
            {showHow ? '▾' : '▸'} How to measure
          </button>
        )}
        {canLog && (
          <button className="link-btn" onClick={onLog}>
            ✎ Log a measurement
          </button>
        )}
      </div>
      {showHow && howTo && (
        <ol className="ind__how">
          {howTo.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

interface Row {
  day: number
  value: number | null
  band: [number, number] | null
}

function MiniChart({ state }: { state: IndicatorState }) {
  const { param, baseline, series } = state
  const bandByDay = new Map(baseline.map((b) => [b.day, [b.mean - 2 * b.sd, b.mean + 2 * b.sd] as [number, number]]))
  const data: Row[] = series
    .filter((p) => p.actual !== null)
    .map((p) => ({ day: p.day, value: p.actual, band: bandByDay.get(p.day) ?? null }))
  if (data.length < 2) return null
  const t = param.thresholds

  return (
    <div className="ind__chart">
      <ResponsiveContainer width="100%" height={92}>
        <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as Row
              return (
                <div className="chart-tip">
                  <b>Mission day {p.day}</b>
                  <div>
                    Measured: <b>{p.value?.toFixed(param.decimals) ?? '—'}</b> {param.unit}
                  </div>
                  {p.band && (
                    <div className="muted">
                      Your normal then: {p.band[0].toFixed(param.decimals)}–{p.band[1].toFixed(param.decimals)}
                    </div>
                  )}
                </div>
              )
            }}
          />
          <Area dataKey="band" stroke="none" fill="#2dd4bf" fillOpacity={0.13} isAnimationActive={false} />
          <ReferenceLine y={t.warning} stroke={STATUS_COLORS.warning} strokeDasharray="4 4" strokeOpacity={0.7} ifOverflow="hidden" />
          <ReferenceLine y={t.critical} stroke={STATUS_COLORS.critical} strokeDasharray="4 4" strokeOpacity={0.7} ifOverflow="hidden" />
          <Line dataKey="value" stroke="#00f5d4" strokeWidth={2} dot={{ r: 1.6, fill: '#00f5d4' }} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="ind__legend">
        <span>
          <i className="sw sw--band" /> your normal (learned by the twin)
        </span>
        <span>
          <i className="sw sw--line" /> measured
        </span>
      </div>
    </div>
  )
}
