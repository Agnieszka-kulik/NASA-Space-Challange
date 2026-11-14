import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MISSION, formatTimestamp, type SeriesPoint } from '../data/mockData'
import { STATUS_COLORS, STATUS_LABELS, type ParamDef } from '../data/parameters'

export const COLORS = {
  actual: '#00f5d4',
  predicted: '#64748b',
  grid: 'rgba(148, 163, 184, 0.12)',
  axis: '#94a3b8',
  simulated: '#c084fc',
}

interface Props {
  param: ParamDef
  data: SeriesPoint[]
  height?: number
  /** mission days of the simulated event (shaded on the chart) */
  simWindow?: { start: number; end: number } | null
}

interface TooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: SeriesPoint }>
  param: ParamDef
}

function ChartTooltip({ active, payload, param }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">Mission day {p.day}</div>
      {p.actual !== null && (
        <div>
          <i style={{ background: COLORS.actual }} /> Measured: <b>{p.actual} {param.unit}</b>
          {p.status !== 'ok' && (
            <span className="chart-tooltip__status" style={{ color: STATUS_COLORS[p.status] }}>
              {STATUS_LABELS[p.status]}
            </span>
          )}
        </div>
      )}
      <div>
        <i className="dashed" /> Predicted: <b>{p.predicted.toFixed(param.decimals)} {param.unit}</b>
      </div>
      {p.simulated !== undefined && p.simulated !== null && (
        <div>
          <i className="dashed dashed--sim" /> Simulated: <b>{p.simulated} {param.unit}</b>
          {p.simStatus && p.simStatus !== 'ok' && (
            <span className="chart-tooltip__status" style={{ color: STATUS_COLORS[p.simStatus] }}>
              {STATUS_LABELS[p.simStatus]}
            </span>
          )}
        </div>
      )}
      {p.timestamp && <div className="chart-tooltip__time">🕒 measured {formatTimestamp(p.timestamp)}</div>}
    </div>
  )
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: SeriesPoint
}

/** Measurement points are only drawn when out of range: yellow = warning, red = critical */
function StatusDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload || payload.actual === null || payload.status === 'ok') {
    return <g />
  }
  const color = STATUS_COLORS[payload.status]
  return <circle cx={cx} cy={cy} r={payload.status === 'critical' ? 4.5 : 3.5} fill={color} stroke="#0b1426" strokeWidth={1.5} />
}

/** Simulated points: hollow rings, only when the prediction leaves the safe range */
function SimDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload || payload.simulated == null || !payload.simStatus || payload.simStatus === 'ok') {
    return <g />
  }
  return <circle cx={cx} cy={cy} r={3.5} fill="#0b1426" stroke={STATUS_COLORS[payload.simStatus]} strokeWidth={2} />
}

/** Chart: blue line = measurements, gray dashed = mission prediction, colored zones = thresholds */
export default function TrendChart({ param, data, height = 150, simWindow }: Props) {
  const { warning, critical, direction } = param.thresholds
  const values = data.flatMap((d) => [d.predicted, d.actual ?? d.predicted, d.simulated ?? d.predicted])
  // environment charts always show the warning limit for context
  if (param.category === 'environment') values.push(warning)
  const pad = (Math.max(...values) - Math.min(...values)) * 0.15 || 1
  const yMin = Math.min(...values) - pad
  const yMax = Math.max(...values) + pad
  const edge = direction === 'high' ? yMax : yMin

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />

        {/* warning / critical zones (clipped to the visible range) */}
        <ReferenceArea y1={warning} y2={critical} fill={STATUS_COLORS.warning} fillOpacity={0.08} ifOverflow="hidden" />
        <ReferenceArea y1={critical} y2={edge} fill={STATUS_COLORS.critical} fillOpacity={0.1} ifOverflow="hidden" />
        <ReferenceLine y={warning} stroke={STATUS_COLORS.warning} strokeDasharray="6 4" strokeOpacity={0.8} />
        <ReferenceLine y={critical} stroke={STATUS_COLORS.critical} strokeDasharray="6 4" strokeOpacity={0.8} />

        {simWindow && (
          <ReferenceArea
            x1={Math.min(simWindow.start, MISSION.lengthDays)}
            x2={Math.min(simWindow.end, MISSION.lengthDays)}
            fill={COLORS.simulated}
            fillOpacity={0.1}
            ifOverflow="hidden"
            label={{ value: 'SIM', fill: COLORS.simulated, fontSize: 9, position: 'insideBottom' }}
          />
        )}

        <XAxis dataKey="day" stroke={COLORS.axis} tick={{ fontSize: 11 }} tickLine={false} ticks={[0, 5, 10, 15, 20, 25, 30]} />
        <YAxis
          stroke={COLORS.axis}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
          domain={[yMin, yMax]}
          allowDataOverflow
          tickFormatter={(v: number) => v.toFixed(param.decimals)}
        />
        <Tooltip
          content={(props: unknown) => <ChartTooltip {...(props as TooltipProps)} param={param} />}
          cursor={{ stroke: 'rgba(0, 245, 212, 0.35)' }}
        />
        <ReferenceLine
          x={MISSION.currentDay}
          stroke="rgba(255,255,255,0.35)"
          strokeDasharray="2 3"
          label={{ value: 'today', fill: '#cfd6e4', fontSize: 10, position: 'insideTopRight' }}
        />
        <Line type="monotone" dataKey="predicted" stroke={COLORS.predicted} strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={COLORS.actual}
          strokeWidth={2}
          dot={(props: unknown) => {
            const { cx, cy, payload, index } = props as DotProps & { index: number }
            return <StatusDot key={index} cx={cx} cy={cy} payload={payload} />
          }}
          activeDot={{ r: 5, stroke: '#0b1426', strokeWidth: 2 }}
          connectNulls
        />
        {simWindow && (
          <Line
            type="monotone"
            dataKey="simulated"
            stroke={COLORS.simulated}
            strokeWidth={2.5}
            strokeDasharray="2 4"
            strokeLinecap="round"
            dot={(props: unknown) => {
              const { cx, cy, payload, index } = props as DotProps & { index: number }
              return <SimDot key={index} cx={cx} cy={cy} payload={payload} />
            }}
            activeDot={{ r: 4, fill: COLORS.simulated }}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ChartLegend({ simulating = false }: { simulating?: boolean }) {
  return (
    <div className="legend">
      <span><i style={{ background: COLORS.actual }} /> Measured</span>
      <span><i className="dashed" /> Predicted for mission (model – mocked for now)</span>
      {simulating && (
        <span className="legend__sim"><i className="dashed dashed--sim" /> 🔮 Scenario prediction (digital twin)</span>
      )}
      <span><b className="legend__dot" style={{ background: STATUS_COLORS.warning }} /> Warning</span>
      <span><b className="legend__dot" style={{ background: STATUS_COLORS.critical }} /> Critical</span>
      <span className="legend__hint">Hover a chart to see the value and measurement time</span>
    </div>
  )
}

/** Badge in the chart header: status of the latest value + number of flagged measurements */
export function ChartStatusBadge({ data }: { data: SeriesPoint[] }) {
  const measured = data.filter((d) => d.actual !== null)
  const latest = measured[measured.length - 1]?.status ?? 'ok'
  const flagged = measured.filter((d) => d.status !== 'ok').length
  if (latest === 'ok' && flagged === 0) return null
  return (
    <span className={`chart-badge chart-badge--${latest === 'ok' ? 'warning' : latest}`}>
      {latest === 'ok' ? '⚠' : STATUS_LABELS[latest]} · {flagged} flagged
    </span>
  )
}

/** Badge in the chart header when the running simulation predicts a problem for this parameter */
export function ChartSimBadge({ data }: { data: SeriesPoint[] }) {
  const sim = data.filter((d) => d.simStatus && d.simStatus !== 'ok')
  if (!sim.length) return null
  const worst = sim.some((d) => d.simStatus === 'critical') ? 'critical' : 'warning'
  return (
    <span className="chart-badge chart-badge--sim" title="Predicted by the running scenario simulation">
      🔮 {worst === 'critical' ? '✖' : '⚠'} from day {sim[0].day}
    </span>
  )
}
