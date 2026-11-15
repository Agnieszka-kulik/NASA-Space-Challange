// Parameter definitions the admin can track.
// Adding a new parameter = adding one object here (the mock generator handles it automatically).

export type ParamCategory = 'astronaut' | 'environment'
export type Status = 'ok' | 'warning' | 'critical'

export interface ParamDef {
  id: string
  label: string
  unit: string
  category: ParamCategory
  /** value at mission start */
  baseline: number
  /** how much the value changes (per prediction) by mission end */
  drift: number
  /** random spread of a single measurement */
  noise: number
  /** safety thresholds; `direction: 'high'` = higher is worse, 'low' = lower is worse */
  thresholds: { warning: number; critical: number; direction: 'high' | 'low' }
  decimals: number
  /** how often it is measured (days); default = daily */
  everyDays?: number
  /** short explanation shown to the medical officer */
  info?: string
}

export const PARAMETERS: ParamDef[] = [
  // --- Astronaut (smartwatch data / in-app tests from the user panel) ---
  { id: 'temperature', label: 'Body temperature', unit: '°C', category: 'astronaut', baseline: 36.6, drift: 0.3, noise: 0.15, decimals: 2, thresholds: { warning: 37.2, critical: 37.6, direction: 'high' } },
  { id: 'stress', label: 'Stress level', unit: '/100', category: 'astronaut', baseline: 30, drift: 25, noise: 6, decimals: 0, thresholds: { warning: 65, critical: 80, direction: 'high' } },
  { id: 'fatigue', label: 'Fatigue', unit: '/100', category: 'astronaut', baseline: 25, drift: 30, noise: 7, decimals: 0, thresholds: { warning: 65, critical: 80, direction: 'high' } },
  { id: 'reflex', label: 'Reaction time', unit: 'ms', category: 'astronaut', baseline: 250, drift: 35, noise: 12, decimals: 0, thresholds: { warning: 310, critical: 340, direction: 'high' } },
  { id: 'memory', label: 'Memory test', unit: 'pts', category: 'astronaut', baseline: 85, drift: -12, noise: 4, decimals: 0, thresholds: { warning: 68, critical: 60, direction: 'low' } },
  { id: 'bloodPressure', label: 'Blood pressure (systolic)', unit: 'mmHg', category: 'astronaut', baseline: 118, drift: 6, noise: 4, decimals: 0, thresholds: { warning: 135, critical: 150, direction: 'high' }, info: 'Fluid shifts toward the head in microgravity change blood pressure regulation; cardiovascular events are a key spaceflight risk.' },
  { id: 'glucose', label: 'Blood sugar', unit: 'mg/dL', category: 'astronaut', baseline: 92, drift: 8, noise: 5, decimals: 0, thresholds: { warning: 110, critical: 126, direction: 'high' }, info: 'Inactivity, stress hormones and diet changes can reduce insulin sensitivity during long missions.' },
  { id: 'mood', label: 'Mood', unit: '/5', category: 'astronaut', baseline: 4.2, drift: -0.7, noise: 0.35, decimals: 1, thresholds: { warning: 2.8, critical: 2.0, direction: 'low' }, info: 'Isolation, confinement and distance from Earth raise the risk of behavioral health problems. Logged daily in the astronaut app.' },
  { id: 'boneDensity', label: 'Bone density', unit: '% of pre-flight', category: 'astronaut', baseline: 100, drift: -1.4, noise: 0.15, decimals: 1, everyDays: 7, thresholds: { warning: 98.5, critical: 97.5, direction: 'low' }, info: 'Without gravity, weight-bearing bones lose about 1–1.5% of density per month. Measured weekly (ultrasound).' },
  { id: 'heartRate', label: 'Resting heart rate', unit: 'BPM', category: 'astronaut', baseline: 64, drift: 6, noise: 3, decimals: 0, thresholds: { warning: 85, critical: 100, direction: 'high' } },
  { id: 'spo2', label: 'Blood oxygen (SpO₂)', unit: '%', category: 'astronaut', baseline: 98, drift: -1.5, noise: 0.6, decimals: 1, thresholds: { warning: 95, critical: 93, direction: 'low' } },
  { id: 'sleep', label: 'Sleep', unit: 'h', category: 'astronaut', baseline: 7.5, drift: -1.2, noise: 0.5, decimals: 1, thresholds: { warning: 5.5, critical: 4.5, direction: 'low' } },

  // --- Station environment (factors affecting crew health) ---
  { id: 'noise', label: 'Station noise', unit: 'dB', category: 'environment', baseline: 58, drift: 4, noise: 2.5, decimals: 0, thresholds: { warning: 65, critical: 70, direction: 'high' } },
  { id: 'radiation', label: 'Radiation dose', unit: 'mSv/d', category: 'environment', baseline: 0.45, drift: 0.15, noise: 0.06, decimals: 2, thresholds: { warning: 3.0, critical: 6.0, direction: 'high' }, info: 'Daily dose depends on location: ~0.5 mSv/d on the ISS, ~1.4 on the Moon, ~1.8 in Mars transit. Solar particle events can spike it far higher.' },
  { id: 'co2', label: 'CO₂ concentration', unit: 'ppm', category: 'environment', baseline: 2400, drift: 500, noise: 180, decimals: 0, thresholds: { warning: 3500, critical: 4500, direction: 'high' } },
  { id: 'cabinTemp', label: 'Module temperature', unit: '°C', category: 'environment', baseline: 22, drift: 1, noise: 0.5, decimals: 1, thresholds: { warning: 25, critical: 27, direction: 'high' } },
  { id: 'particulates', label: 'Airborne dust (PM2.5)', unit: 'µg/m³', category: 'environment', baseline: 12, drift: 9, noise: 2.5, decimals: 0, thresholds: { warning: 25, critical: 35, direction: 'high' }, info: 'In microgravity dust, lint and skin flakes never settle – they float and are easily inhaled. ISS crews report dust allergies, nasal congestion and eye irritation; cargo opening and exercise raise the particle load.' },
  { id: 'humidity', label: 'Humidity', unit: '%', category: 'environment', baseline: 45, drift: 5, noise: 3, decimals: 0, thresholds: { warning: 60, critical: 70, direction: 'high' } },
]

export const CATEGORY_LABELS: Record<ParamCategory, string> = {
  astronaut: 'Astronaut',
  environment: 'Station environment',
}

// the 6 indicators named in the challenge come first: BP, HR, blood sugar, temperature, sleep, mood
export const DEFAULT_SELECTED = ['bloodPressure', 'heartRate', 'glucose', 'temperature', 'sleep', 'mood', 'stress', 'boneDensity', 'noise', 'radiation', 'co2', 'particulates']

export const getParam = (id: string) => PARAMETERS.find((p) => p.id === id)!

/** Classify a single value against the parameter's thresholds */
export function getStatus(param: ParamDef, value: number | null): Status {
  if (value === null) return 'ok'
  const { warning, critical, direction } = param.thresholds
  if (direction === 'high') return value >= critical ? 'critical' : value >= warning ? 'warning' : 'ok'
  return value <= critical ? 'critical' : value <= warning ? 'warning' : 'ok'
}

const RANK: Record<Status, number> = { ok: 0, warning: 1, critical: 2 }
export const worstStatus = (statuses: Status[]): Status =>
  statuses.reduce<Status>((w, s) => (RANK[s] > RANK[w] ? s : w), 'ok')

export const STATUS_COLORS: Record<Status, string> = {
  ok: '#3ecf8e',
  warning: '#f5b83d',
  critical: '#ff5a5f',
}

export const STATUS_LABELS: Record<Status, string> = {
  ok: '✓ Nominal',
  warning: '⚠ Warning',
  critical: '✖ Critical',
}