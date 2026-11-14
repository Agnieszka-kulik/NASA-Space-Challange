// 🔮 Scenario simulator – "what-if" predictions per astronaut (digital twin, simplified model).
// It never changes real measurements: it adds a separate `simulated` value to future chart points.
//
// Model (mocked for now – a real ML model can replace `simulateSeries` later):
//   simulated(day) = mission prediction(day) + personal offset (latest measurement vs prediction)
//                    + scenario impact × intensity × personal sensitivity × vulnerability × countermeasures × time profile
import { CREW, MISSION, type CrewMember, type SeriesPoint } from './mockData'
import { getParam, getStatus, worstStatus, type Status } from './parameters'
import { LOCATIONS, type LocationId } from './locations'

/** Where the real mission is (measured data comes from here) */
export const MISSION_LOCATION: LocationId = 'mars'

export type ScenarioId = 'solar' | 'co2' | 'sleep' | 'eva' | 'blackout'
export type Intensity = 'mild' | 'moderate' | 'severe'

export interface Countermeasure {
  id: string
  label: string
  /** multiplies the impact on the listed parameters (0.4 = 60% smaller impact) */
  factors: Record<string, number>
}

export interface Scenario {
  id: ScenarioId
  icon: string
  title: string
  description: string
  /** impact at "moderate" intensity, in the parameter's own units (sign = direction) */
  impact: Record<string, number>
  defaultDuration: number
  countermeasures: Countermeasure[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'solar',
    icon: '☀',
    title: 'Solar particle event',
    description: 'A solar flare sends high-energy protons; crew shelters in a cramped, shielded area.',
    impact: { radiation: 5, stress: 10, sleep: -0.8, fatigue: 8 },
    defaultDuration: 2,
    countermeasures: [
      { id: 'shelter', label: 'Storm shelter (water wall) + cancel EVAs', factors: { radiation: 0.35 } },
      { id: 'routine', label: 'Keep sleep routine inside the shelter', factors: { sleep: 0.5, fatigue: 0.7 } },
    ],
  },
  {
    id: 'co2',
    icon: '🫁',
    title: 'CO₂ scrubber failure',
    description: 'Primary CO₂ removal fails; CO₂ builds up causing headaches, fatigue and poor sleep.',
    impact: { co2: 1600, fatigue: 14, stress: 7, heartRate: 6, sleep: -0.6 },
    defaultDuration: 3,
    countermeasures: [
      { id: 'backup', label: 'Switch to backup scrubber immediately', factors: { co2: 0.4, fatigue: 0.5, heartRate: 0.5, sleep: 0.5 } },
      { id: 'noexercise', label: 'Suspend exercise in the module', factors: { heartRate: 0.6, fatigue: 0.8 } },
    ],
  },
  {
    id: 'sleep',
    icon: '🌙',
    title: 'Sleep shift disruption',
    description: 'A docking operation shifts the crew’s sleep schedule by 6 hours.',
    impact: { sleep: -1.2, fatigue: 15, stress: 8, mood: -0.4, reflex: 22, heartRate: 4 },
    defaultDuration: 4,
    countermeasures: [
      { id: 'light', label: 'Light therapy after waking', factors: { sleep: 0.6, mood: 0.7 } },
      { id: 'workload', label: 'Reduce workload during the shift', factors: { fatigue: 0.6, stress: 0.6, reflex: 0.7 } },
      { id: 'melatonin', label: 'Melatonin before planned sleep', factors: { sleep: 0.7 } },
    ],
  },
  {
    id: 'eva',
    icon: '👨‍🚀',
    title: 'High-intensity EVA week',
    description: 'Several long spacewalks in a row: heavy physical load and short rest periods.',
    impact: { fatigue: 18, heartRate: 8, bloodPressure: 9, sleep: -0.7, glucose: 9 },
    defaultDuration: 5,
    countermeasures: [
      { id: 'rest', label: 'Rest day between EVAs', factors: { fatigue: 0.55, heartRate: 0.7, sleep: 0.6 } },
      { id: 'hydration', label: 'Hydration & electrolyte protocol', factors: { bloodPressure: 0.55, heartRate: 0.8 } },
      { id: 'nutrition', label: 'Adjusted meal plan (low sugar)', factors: { glucose: 0.5 } },
    ],
  },
  {
    id: 'blackout',
    icon: '📵',
    title: 'Communication blackout',
    description: 'No contact with Earth (solar conjunction): isolation and confinement increase.',
    impact: { mood: -0.8, stress: 12, sleep: -0.6, fatigue: 5 },
    defaultDuration: 7,
    countermeasures: [
      { id: 'leisure', label: 'Planned crew leisure activities', factors: { mood: 0.6, stress: 0.65 } },
      { id: 'messages', label: 'Pre-recorded family messages', factors: { mood: 0.6 } },
      { id: 'psych', label: 'Daily psychological self-check in the app', factors: { stress: 0.75, sleep: 0.8 } },
    ],
  },
]

export const INTENSITY: Record<Intensity, { label: string; factor: number }> = {
  mild: { label: 'Mild', factor: 0.5 },
  moderate: { label: 'Moderate', factor: 1 },
  severe: { label: 'Severe', factor: 1.7 },
}

export interface SimulationConfig {
  scenarioId: ScenarioId
  intensity: Intensity
  /** days the event lasts */
  duration: number
  /** days from today until the event starts */
  startIn: number
  countermeasures: string[]
  /** simulate the mission at another location (changes radiation + Earth link delay) */
  locationId: LocationId
}

export const getScenario = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!

/** parameters shown in the results table */
export const simParams = (cfg: SimulationConfig) => {
  const params = Object.keys(getScenario(cfg.scenarioId).impact)
  return cfg.locationId !== MISSION_LOCATION && !params.includes('radiation') ? ['radiation', ...params] : params
}

export const simWindow = (cfg: SimulationConfig) => {
  const start = MISSION.currentDay + cfg.startIn
  return { start, end: start + cfg.duration }
}

/** 0..1 – rises over ~1.5 days, holds during the event, then recovers over ~3 days */
function profile(day: number, start: number, end: number) {
  if (day < start) return 0
  const rise = Math.min(1, (day - start + 1) / 1.5)
  if (day <= end) return rise
  return rise * Math.exp(-(day - end) / 2.2)
}

const VULNERABILITY: Record<Status, number> = { ok: 1, warning: 1.1, critical: 1.2 }

/** physiologically plausible limits so predictions never go absurd */
const LIMITS: Record<string, [number, number]> = {
  stress: [0, 100],
  fatigue: [0, 100],
  mood: [1, 5],
  sleep: [3, 10],
  spo2: [85, 100],
  memory: [0, 100],
  heartRate: [40, 140],
}
const clamp = (id: string, v: number) => {
  const l = LIMITS[id]
  return l ? Math.min(l[1], Math.max(l[0], v)) : v
}

/** Adds `simulated` values (from today on) to a series. Returns the series unchanged if the scenario doesn't affect it. */
export function simulateSeries(
  series: SeriesPoint[],
  paramId: string,
  cfg: SimulationConfig | null,
  member?: CrewMember,
): SeriesPoint[] {
  if (!cfg) return series
  const scenario = getScenario(cfg.scenarioId)
  // moving the mission changes the baseline radiation dose
  const radiationShift = paramId === 'radiation' ? LOCATIONS[cfg.locationId].radiation - LOCATIONS[MISSION_LOCATION].radiation : 0
  const impact = scenario.impact[paramId] ?? (radiationShift !== 0 ? 0 : undefined)
  if (impact === undefined) return series

  const param = getParam(paramId)
  const lastMeasured = [...series].reverse().find((p) => p.actual !== null)
  if (!lastMeasured || lastMeasured.actual === null) return series

  const offset = lastMeasured.actual - lastMeasured.predicted
  const cmFactor = scenario.countermeasures
    .filter((c) => cfg.countermeasures.includes(c.id))
    .reduce((f, c) => f * (c.factors[paramId] ?? 1), 1)
  const personal = member ? member.sensitivity * VULNERABILITY[lastMeasured.status] : 1
  const amplitude = impact * INTENSITY[cfg.intensity].factor * personal * cmFactor
  const { start, end } = simWindow(cfg)

  return series.map((p) => {
    if (p.day < lastMeasured.day) return p
    // offset fades slowly – the body drifts back toward the mission prediction
    const fade = Math.exp(-(p.day - lastMeasured.day) / 12)
    const value = p.predicted + offset * fade + radiationShift + amplitude * profile(p.day, start, end)
    const rounded = Number(clamp(paramId, value).toFixed(param.decimals))
    return { ...p, simulated: rounded, simStatus: getStatus(param, rounded) }
  })
}

export function simulateAll<T extends Record<string, SeriesPoint[]>>(data: T, cfg: SimulationConfig | null, member?: CrewMember): T {
  if (!cfg) return data
  return Object.fromEntries(Object.entries(data).map(([id, s]) => [id, simulateSeries(s, id, cfg, member)])) as T
}

// ---------- results summary for the simulator panel ----------

export interface ImpactCell {
  paramId: string
  peak: number
  status: Status
  /** first mission day the prediction crosses into warning/critical */
  firstBadDay: number | null
}

export interface ImpactRow {
  /** astronaut id or 'station' */
  id: string
  name: string
  cells: ImpactCell[]
  worst: Status
}

function cellFor(series: SeriesPoint[], paramId: string): ImpactCell {
  const param = getParam(paramId)
  const sim = series.filter((p) => p.simulated !== undefined && p.simulated !== null)
  const pick = param.thresholds.direction === 'high' ? Math.max : Math.min
  const peak = pick(...sim.map((p) => p.simulated as number))
  const firstBad = sim.find((p) => p.simStatus && p.simStatus !== 'ok')
  return { paramId, peak, status: getStatus(param, peak), firstBadDay: firstBad ? firstBad.day : null }
}

export function summarize(
  cfg: SimulationConfig,
  crewSeries: Record<string, Record<string, SeriesPoint[]>>,
  environment: Record<string, SeriesPoint[]>,
): ImpactRow[] {
  const params = simParams(cfg)
  const rows: ImpactRow[] = []

  const envParams = params.filter((id) => getParam(id).category === 'environment')
  if (envParams.length) {
    const cells = envParams.map((id) => cellFor(environment[id], id))
    rows.push({ id: 'station', name: 'Station', cells, worst: worstStatus(cells.map((c) => c.status)) })
  }
  const crewParams = params.filter((id) => getParam(id).category === 'astronaut')
  for (const m of CREW) {
    const cells = crewParams.map((id) => cellFor(crewSeries[m.id][id], id))
    rows.push({ id: m.id, name: m.name, cells, worst: worstStatus(cells.map((c) => c.status)) })
  }
  return rows
}
