// 🧪 FAKE data generator. Later, swap this for a real API / ML model –
// just return data in the same shape (types below).
import { PARAMETERS, getParam, getStatus, worstStatus, type ParamDef, type Status } from './parameters'

export const MISSION = {
  name: 'DUCK-1',
  lengthDays: 30,
  currentDay: 18,
  start: new Date('2026-10-27T00:00:00Z'),
}

export interface Appearance {
  skin: string
  hair: string
  hairStyle: 'short' | 'long' | 'bun' | 'buzz' | 'curly'
}

export interface CrewMember {
  id: string
  name: string
  role: string
  code: string
  /** how strongly the mission affects this person (makes charts differ) */
  sensitivity: number
  /** illustrated avatar look */
  appearance: Appearance
  /** optional real photo, e.g. '/crew/a1.jpg' (put the file in /public/crew) */
  photo?: string
  /** parameters that drift into a bad range for this person (demo of problems) */
  anomalies?: Partial<Record<string, Exclude<Status, 'ok'>>>
}

export const CREW: CrewMember[] = [
  { id: 'a1', name: 'Kowalska', role: 'Commander', code: '012A', sensitivity: 0.8, appearance: { skin: '#f1c7a5', hair: '#6b4226', hairStyle: 'bun' } },
  { id: 'a2', name: 'Nowak', role: 'Pilot', code: '019B', sensitivity: 1.0, appearance: { skin: '#e8b48f', hair: '#2b2b2b', hairStyle: 'short' } },
  { id: 'a3', name: 'Ito', role: 'Flight Engineer', code: '023C', sensitivity: 1.1, appearance: { skin: '#f0cfa8', hair: '#111111', hairStyle: 'buzz' } },
  { id: 'a4', name: 'Moreau', role: 'Medical Officer', code: '031D', sensitivity: 0.9, appearance: { skin: '#f3d0b5', hair: '#c9a15a', hairStyle: 'long' } },
  {
    id: 'a5',
    name: 'Okafor',
    role: 'Science Officer',
    code: '044E',
    sensitivity: 1.2,
    appearance: { skin: '#7a4a2c', hair: '#1a1a1a', hairStyle: 'curly' },
    // 🚨 This astronaut always shows problematic values (for the demo)
    anomalies: {
      // isolation + poor sleep -> behavioral health & cardiovascular strain
      sleep: 'critical',
      stress: 'critical',
      mood: 'critical',
      fatigue: 'warning',
      heartRate: 'warning',
      bloodPressure: 'warning',
    },
  },
  {
    id: 'a6',
    name: 'Larsen',
    role: 'Mission Specialist',
    code: '057F',
    sensitivity: 0.95,
    appearance: { skin: '#f6d9c4', hair: '#d9b26f', hairStyle: 'short' },
    // skipped exercise sessions -> faster bone loss
    anomalies: { boneDensity: 'critical' }, // trending toward critical; latest weekly scan shows a warning
  },
]

/** One chart point: mission day, measurement (if taken yet) and prediction */
export interface SeriesPoint {
  day: number
  actual: number | null
  predicted: number
  /** when the measurement was taken (ISO) */
  timestamp: string | null
  status: Status
  /** scenario simulation (digital twin prediction) – only when a simulation is running */
  simulated?: number | null
  simStatus?: Status
}

// Seeded pseudo-random generator – the same data after a page refresh
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
const round = (v: number, d: number) => Number(v.toFixed(d))

/** Target value a little past the given threshold, in the "bad" direction */
export function badTarget(param: ParamDef, level: Exclude<Status, 'ok'>) {
  const { warning, critical, direction } = param.thresholds
  const sign = direction === 'high' ? 1 : -1
  const gap = Math.abs(critical - warning)
  return level === 'critical' ? critical + sign * gap * 0.35 : warning + sign * gap * 0.35
}

/**
 * Generates a series for a parameter.
 * - predicted: a smooth curve over the whole mission (what the "model" expects)
 * - actual: measurements up to today = prediction + noise + personal offset
 *   (+ a drift into the warning/critical zone if the person has an anomaly)
 */
export function generateSeries(
  param: ParamDef,
  sensitivity: number,
  seed: number,
  anomaly?: Exclude<Status, 'ok'>,
): SeriesPoint[] {
  const rand = mulberry32(seed + hash(param.id))
  const offset = (rand() - 0.5) * param.noise * 1.5 // constant personal offset
  const anomalyStart = 7
  const points: SeriesPoint[] = []

  for (let day = 0; day <= MISSION.lengthDays; day++) {
    const progress = day / MISSION.lengthDays
    // saturation curve – faster changes early in the mission
    const predicted = param.baseline + param.drift * sensitivity * (1 - Math.exp(-3 * progress))

    let actual: number | null = null
    let timestamp: string | null = null
    const measuredToday = day % (param.everyDays ?? 1) === 0
    if (day <= MISSION.currentDay && measuredToday) {
      actual = predicted + offset + (rand() - 0.5) * 2 * param.noise
      if (anomaly && day > anomalyStart) {
        const k = Math.min(1, (day - anomalyStart) / (MISSION.currentDay - anomalyStart))
        const target = badTarget(param, anomaly) + (rand() - 0.5) * param.noise
        actual = actual + (target - actual) * k * k
      }
      const t = new Date(MISSION.start)
      t.setUTCDate(t.getUTCDate() + day)
      t.setUTCHours(6 + Math.floor(rand() * 14), Math.floor(rand() * 60))
      timestamp = t.toISOString()
    }

    const actualRounded = actual === null ? null : round(actual, param.decimals)
    points.push({
      day,
      predicted: round(predicted, param.decimals + 1),
      actual: actualRounded,
      timestamp,
      status: getStatus(param, actualRounded),
    })
  }
  return points
}

export function generateAstronautSeries(member: CrewMember, seed: number) {
  return Object.fromEntries(
    PARAMETERS.filter((p) => p.category === 'astronaut').map((p) => [
      p.id,
      generateSeries(p, member.sensitivity, seed + hash(member.id), member.anomalies?.[p.id]),
    ]),
  )
}

/** The environment is shared by the whole station (sensitivity = 1); radiation depends on location */
export function generateEnvironment(seed: number, radiationBaseline = 0.45) {
  return Object.fromEntries(
    PARAMETERS.filter((p) => p.category === 'environment').map((p) => {
      const scale = radiationBaseline / p.baseline
      const def = p.id === 'radiation' ? { ...p, baseline: radiationBaseline, drift: p.drift * scale, noise: p.noise * scale } : p
      return [p.id, generateSeries(def, 1, seed)]
    }),
  )
}

/** Status of the latest measurement in a series */
export const latestStatus = (series: SeriesPoint[]) =>
  [...series].reverse().find((p) => p.actual !== null)?.status ?? 'ok'

/** "Live" vital signs for the crew cards */
export interface LiveVitals {
  heartRate: number
  spo2: number
  temperature: number
}

export function generateLiveVitals(member: CrewMember, rand = Math.random): LiveVitals {
  const live: LiveVitals = {
    heartRate: Math.round(62 + member.sensitivity * 6 + (rand() - 0.5) * 8),
    spo2: round(98.4 - member.sensitivity * 0.6 + (rand() - 0.5) * 0.6, 1),
    temperature: round(36.6 + member.sensitivity * 0.15 + (rand() - 0.5) * 0.2, 1),
  }
  // astronauts with anomalies also look bad "live"
  for (const key of ['heartRate', 'spo2', 'temperature'] as const) {
    const level = member.anomalies?.[key]
    if (level) {
      const p = getParam(key)
      live[key] = round(badTarget(p, level) + (rand() - 0.5) * p.noise, key === 'heartRate' ? 0 : 1)
    }
  }
  return live
}

export const liveVitalsStatus = (v: LiveVitals): Status =>
  worstStatus((['heartRate', 'spo2', 'temperature'] as const).map((k) => getStatus(getParam(k), v[k])))

export function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
