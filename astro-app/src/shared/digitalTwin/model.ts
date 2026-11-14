// 🧬 Digital twin model of ONE astronaut.
//
//   twin = personal profile (numbers) + shared models (rules, NASA knowledge, our ML models)
//
// 1. Personal baseline: mean ± spread of each indicator in the baseline window (first 7 days),
//    then updated with every new normal-looking measurement (exponential moving average) – the twin
//    "learns" the astronaut's new normal in space, but ignores abnormal values.
// 2. Every new value is judged twice: against medical thresholds AND against the personal normal
//    (z-score). A value can be fine for the population but unusual for this person.
// 3. Indicator states roll up into body-system states for the clickable figure.
import { CREW, MISSION, generateAstronautSeries, generateEnvironment, generateSeries, type SeriesPoint } from '../../features/admin/data/mockData'
import { PARAMETERS, getStatus, worstStatus, type ParamDef, type Status } from '../../features/admin/data/parameters'
import { LOCATIONS } from '../../features/admin/data/locations'
import { MISSION_LOCATION } from '../../features/admin/data/simulation'
import { TWIN_PARAMETERS } from './indicators'
import { SYSTEMS, type SystemId } from './knowledge'

export const ALL_PARAMS: ParamDef[] = [...PARAMETERS.filter((p) => p.category === 'astronaut'), ...TWIN_PARAMETERS]
export const getTwinParam = (id: string) => ALL_PARAMS.find((p) => p.id === id)!

const BASELINE_DAYS = 7
const ALPHA = 0.15 // how fast the personal normal adapts to new data
const PERSONAL_Z = 2.5 // how unusual (in personal standard deviations) triggers a flag

/** twin-only demo conditions so different body systems light up for different people */
const TWIN_ANOMALIES: Record<string, Partial<Record<string, Exclude<Status, 'ok'>>>> = {
  a3: { symptoms: 'warning' }, // Ito – starting infection (immune)
  a5: { hydration: 'warning', recoveryH: 'warning' }, // Okafor – drinks too little, recovers slowly
  a6: { exerciseMin: 'warning' }, // Larsen – skips exercise -> bone loss
}

export interface MlExport {
  generatedAt: string
  source: string
  astronauts: Record<string, { exerciseMin?: Record<string, number>; recoveryH?: Record<string, number> }>
}

export interface TwinData {
  astronautId: string
  series: Record<string, SeriesPoint[]>
  /** true for indicators that came from a real ML export (not demo values) */
  fromMl: Set<string>
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)

export function buildTwinData(astronautId: string, seed = 42, ml?: MlExport | null): TwinData {
  const member = CREW.find((c) => c.id === astronautId) ?? CREW[0]
  const series: Record<string, SeriesPoint[]> = { ...generateAstronautSeries(member, seed) }

  for (const p of TWIN_PARAMETERS) {
    if (p.id === 'radiationDose') continue
    let s = generateSeries(p, member.sensitivity, seed + hash(member.id), TWIN_ANOMALIES[member.id]?.[p.id])
    if (p.id === 'symptoms') s = s.map((x) => (x.actual === null ? x : { ...x, actual: Math.max(0, x.actual), status: getStatus(p, Math.max(0, x.actual)) }))
    series[p.id] = s
  }

  // cumulative radiation dose = sum of the station's daily dose (same data as the CMO console)
  const env = generateEnvironment(seed, LOCATIONS[MISSION_LOCATION].radiation)
  const doseParam = TWIN_PARAMETERS.find((p) => p.id === 'radiationDose')!
  let total = 0
  series.radiationDose = env.radiation.map((d) => {
    if (d.actual !== null) total += d.actual
    const planned = LOCATIONS[MISSION_LOCATION].radiation * (d.day + 1)
    const actual = d.actual === null ? null : Math.round(total)
    return { ...d, actual, predicted: Math.round(planned), status: getStatus(doseParam, actual) }
  })

  // real ML results (if the export script was run) replace the demo values
  const fromMl = new Set<string>()
  const mlData = ml?.astronauts?.[astronautId]
  for (const key of ['exerciseMin', 'recoveryH'] as const) {
    const values = mlData?.[key]
    if (!values) continue
    const param = getTwinParam(key)
    series[key] = series[key].map((p) => (values[String(p.day)] !== undefined ? { ...p, actual: values[String(p.day)], status: getStatus(param, values[String(p.day)]) } : p))
    fromMl.add(key)
  }

  return { astronautId: member.id, series, fromMl }
}

// ---------------------------------------------------------------------------------------------
// Personal baseline + evaluation
// ---------------------------------------------------------------------------------------------

export interface BaselinePoint {
  day: number
  mean: number
  sd: number
}

export interface IndicatorState {
  param: ParamDef
  latest: SeriesPoint | null
  /** previous measurement (for the trend arrow) */
  previous: SeriesPoint | null
  status: Status
  /** why the status was given */
  reason: 'nominal' | 'threshold' | 'personal' | 'no-data'
  /** z-score vs the personal normal (positive = above normal) */
  z: number | null
  normal: { low: number; high: number; mean: number } | null
  /** personal normal over time, for the chart band */
  baseline: BaselinePoint[]
  /** full series (measured + predicted) */
  series: SeriesPoint[]
}

/**
 * Personal normal over time. The twin learns the astronaut's personal deviation (residual) from the
 * EXPECTED mission course (the prediction line), so expected adaptation to space – e.g. fatigue slowly
 * rising – is not flagged, while anything unusual for this person is.
 */
export function personalBaseline(param: ParamDef, series: SeriesPoint[]): BaselinePoint[] {
  const measured = series.filter((p) => p.actual !== null) as (SeriesPoint & { actual: number })[]
  if (measured.length < 2) return []
  const resid = (p: SeriesPoint & { actual: number }) => p.actual - p.predicted
  const window = measured.filter((p) => p.day < BASELINE_DAYS)
  const init = window.length >= 2 ? window : measured.slice(0, 2)
  let mean = init.reduce((s, p) => s + resid(p), 0) / init.length
  let variance = init.reduce((s, p) => s + (resid(p) - mean) ** 2, 0) / init.length
  // minimum spread: sensor noise and measurement resolution (e.g. whole lines in the vision test)
  const floor = Math.max(param.noise * 0.6, Math.abs(param.baseline) * 0.005, 0.6 * 10 ** -param.decimals, 0.05)

  const out: BaselinePoint[] = []
  for (const p of measured) {
    const sd = Math.max(Math.sqrt(variance), floor)
    out.push({ day: p.day, mean: p.predicted + mean, sd })
    if (p.day >= BASELINE_DAYS - 1) {
      // learn from the new measurement – but NOT from abnormal ones, otherwise a slow
      // deterioration would quietly become the "new normal"
      const diff = resid(p) - mean
      const abnormal = Math.abs(diff / sd) >= PERSONAL_Z || getStatus(param, p.actual) !== 'ok'
      if (!abnormal) {
        mean += ALPHA * diff
        variance = (1 - ALPHA) * (variance + ALPHA * diff * diff)
      }
    }
  }
  return out
}

export function evaluateIndicator(param: ParamDef, series: SeriesPoint[]): IndicatorState {
  const measured = series.filter((p) => p.actual !== null)
  const latest = measured.at(-1) ?? null
  const previous = measured.at(-2) ?? null
  const baseline = personalBaseline(param, series)
  if (!latest || latest.actual === null) {
    return { param, latest: null, previous: null, status: 'ok', reason: 'no-data', z: null, normal: null, baseline, series }
  }

  // compare with the personal normal expected for this day (learned before this measurement)
  const ref = baseline.at(-1)
  let z: number | null = null
  let normal = null
  let personalFlag: Status = 'ok'
  if (ref && param.noise > 0) {
    z = (latest.actual - ref.mean) / ref.sd
    normal = { low: ref.mean - 2 * ref.sd, high: ref.mean + 2 * ref.sd, mean: ref.mean }
    const bad = param.thresholds.direction === 'high' ? z : -z
    if (bad >= PERSONAL_Z) personalFlag = 'warning'
  }
  const thresholdStatus = getStatus(param, latest.actual)
  const status = worstStatus([thresholdStatus, personalFlag])
  const reason = status === 'ok' ? 'nominal' : thresholdStatus !== 'ok' ? 'threshold' : 'personal'
  return { param, latest, previous, status, reason, z, normal, baseline, series }
}

export interface SystemState {
  id: SystemId
  status: Status
  indicators: IndicatorState[]
}

export function evaluateTwin(data: TwinData): Record<SystemId, SystemState> {
  const out = {} as Record<SystemId, SystemState>
  for (const sys of SYSTEMS) {
    const indicators = sys.indicators.filter((id) => data.series[id]).map((id) => evaluateIndicator(getTwinParam(id), data.series[id]))
    out[sys.id] = { id: sys.id, status: worstStatus(indicators.map((i) => i.status)), indicators }
  }
  return out
}

/** Writes manually logged values into today's measurement (the twin re-evaluates immediately) */
export function applyLog(data: TwinData, values: Record<string, number>, when = new Date()): TwinData {
  const series = { ...data.series }
  for (const [id, value] of Object.entries(values)) {
    if (!series[id] || Number.isNaN(value)) continue
    const param = getTwinParam(id)
    series[id] = series[id].map((p) =>
      p.day === MISSION.currentDay ? { ...p, actual: value, status: getStatus(param, value), timestamp: when.toISOString() } : p,
    )
  }
  return { ...data, series }
}

/** One-sentence explanation for an indicator, in plain language */
export function explain(state: IndicatorState): string {
  const { param, latest, status, reason, normal, z } = state
  if (!latest || latest.actual === null) return 'No measurement yet.'
  const v = `${latest.actual} ${param.unit}`
  const range = normal ? `your normal is ${fmt(normal.low, param)}–${fmt(normal.high, param)}` : ''
  if (status === 'ok') return `${v} – nominal${range ? `, ${range}` : ''}.`
  if (reason === 'personal')
    return `${v} is inside the medical range, but unusual for YOU (${Math.abs(z ?? 0).toFixed(1)} personal deviations; ${range}). Early warning.`
  const t = param.thresholds[status as 'warning' | 'critical']
  const sign = param.thresholds.direction === 'high' ? '≥' : '≤'
  return `${v} crosses the ${status} limit (${sign} ${t} ${param.unit})${range ? `; ${range}` : ''}.`
}

/** formats a value, avoiding "-0" and impossible negatives for counts/percentages */
export function fmt(v: number, param: ParamDef) {
  const x = param.baseline >= 0 && v < 0 ? 0 : v
  const s = x.toFixed(param.decimals)
  return s === '-0' ? '0' : s
}
