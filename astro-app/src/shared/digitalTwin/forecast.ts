// 🔭 Long-term mission forecast ("what if") for one astronaut.
// Rates come from NASA evidence where available; everything else is a clearly labelled assumption.
//   • Bone: 1–1.5 % density loss per month in microgravity (NASA) → we use 1.25 %/month,
//     scaled by the astronaut's OWN measured loss rate (from the twin).
//   • Radiation: daily dose by location; NASA career limit 600 mSv.
//   • SANS: ~2/3 of long-duration astronauts show vision changes (NASA SANS brief).
//   • Muscle & immune resilience: illustrative models (assumptions listed in ASSUMPTIONS).
import type { Status } from '../../features/admin/data/parameters'
import type { SystemId } from './knowledge'

export type MissionProfileId = 'iss' | 'mars'

export interface MissionPhase {
  name: string
  days: number
  /** mSv per day */
  dose: number
  /** load factor on bones/muscles: 0 = microgravity, 1 = Earth */
  gravity: number
}

export const MISSION_PROFILES: Record<MissionProfileId, { name: string; phases: MissionPhase[] }> = {
  iss: { name: 'ISS – 6 months', phases: [{ name: 'ISS (LEO)', days: 180, dose: 0.5, gravity: 0 }] },
  mars: {
    name: 'Mars – ~900 days',
    phases: [
      { name: 'Transit to Mars', days: 180, dose: 1.8, gravity: 0 },
      { name: 'Mars surface', days: 540, dose: 0.7, gravity: 0.38 },
      { name: 'Return transit', days: 180, dose: 1.8, gravity: 0 },
    ],
  },
}

export interface Countermeasures {
  /** ~2 h/day resistance + aerobic exercise, as on the ISS */
  exercise: boolean
  /** vitamin D + calcium + full energy intake */
  nutrition: boolean
  /** protected 8 h sleep window */
  sleep: boolean
}

export const ASSUMPTIONS = [
  'Bone loss 1.25 %/month in microgravity (NASA: 1–1.5 %), multiplied by your personal measured rate.',
  'Exercise halves bone loss and cuts muscle loss by 80 %; nutrition (vitamin D, calcium, full energy intake) reduces bone loss by a further 15 %.',
  'Partial gravity on Mars (0.38 g) reduces unloading effects proportionally (assumption – no human data yet).',
  'Radiation dose: ISS 0.5, Mars transit 1.8, Mars surface 0.7 mSv/day; NASA career limit 600 mSv.',
  'SANS risk rises toward ~70 % over long missions (NASA: about two-thirds of long-duration astronauts).',
  'Muscle and immune-resilience curves are illustrative, not clinical predictions.',
]

export interface ForecastPoint {
  day: number
  bone: number
  muscle: number
  dose: number
  sans: number
  immune: number
  phase: string
}

export interface ForecastInput {
  profile: MissionProfileId
  cm: Countermeasures
  /** personal multiplier of bone loss (1 = average astronaut) */
  boneFactor: number
  /** personal stress reactivity factor (from the real stress profile) */
  stressFactor: number
}

const BONE_PER_DAY = 1.25 / 30 // % per day
const MUSCLE_PER_DAY = 0.12 // % per day without exercise (illustrative)

export function forecast({ profile, cm, boneFactor, stressFactor }: ForecastInput): ForecastPoint[] {
  const phases = MISSION_PROFILES[profile].phases
  const total = phases.reduce((s, p) => s + p.days, 0)
  const points: ForecastPoint[] = []
  let bone = 100
  let muscle = 100
  let dose = 0
  let microDays = 0

  for (let day = 0; day <= total; day++) {
    let acc = 0
    const phase = phases.find((p) => (acc += p.days) > day) ?? phases[phases.length - 1]
    const unloading = 1 - phase.gravity

    if (day > 0) {
      const boneRate = BONE_PER_DAY * boneFactor * unloading * (cm.exercise ? 0.5 : 1) * (cm.nutrition ? 0.85 : 1)
      bone -= boneRate
      const muscleRate = MUSCLE_PER_DAY * unloading * (cm.exercise ? 0.2 : 1) * (cm.nutrition ? 0.9 : 1)
      muscle = Math.max(60, muscle - muscleRate * (muscle / 100))
      dose += phase.dose
      if (phase.gravity < 0.1) microDays++
    }
    const sans = 70 * (1 - Math.exp(-microDays / 150))
    // immune resilience: drops with mission length; poor sleep and high stress reactivity speed it up
    const immune = 100 - 25 * (1 - Math.exp(-day / 200)) * (cm.sleep ? 0.55 : 1) * stressFactor

    points.push({ day, bone: round(bone), muscle: round(muscle), dose: Math.round(dose), sans: Math.round(sans), immune: round(immune), phase: phase.name })
  }
  return points
}

const round = (v: number) => Math.round(v * 10) / 10

/** thresholds used for the forecast colours */
export const FORECAST_LIMITS = {
  bone: { warning: 95, critical: 90 }, // % of pre-flight density
  muscle: { warning: 90, critical: 80 }, // % of pre-flight strength
  dose: { warning: 300, critical: 600 }, // mSv – 600 = NASA career limit
  sans: { warning: 35, critical: 60 }, // % risk
  immune: { warning: 88, critical: 80 },
}

const low = (v: number, l: { warning: number; critical: number }): Status => (v <= l.critical ? 'critical' : v <= l.warning ? 'warning' : 'ok')
const high = (v: number, l: { warning: number; critical: number }): Status => (v >= l.critical ? 'critical' : v >= l.warning ? 'warning' : 'ok')

/** status of each body system at a forecast point (for colouring the figure) */
export function forecastStatus(p: ForecastPoint): Partial<Record<SystemId, Status>> {
  return {
    bones: low(p.bone, FORECAST_LIMITS.bone),
    muscles: low(p.muscle, FORECAST_LIMITS.muscle),
    radiation: high(p.dose, FORECAST_LIMITS.dose),
    eyes: high(p.sans, FORECAST_LIMITS.sans),
    immune: low(p.immune, FORECAST_LIMITS.immune),
  }
}

/** first mission day a metric reaches a level (null = never during the mission) */
export function firstDay(points: ForecastPoint[], key: 'bone' | 'muscle' | 'dose' | 'sans' | 'immune', level: 'warning' | 'critical') {
  const l = FORECAST_LIMITS[key][level]
  const isHigh = key === 'dose' || key === 'sans'
  return points.find((p) => (isHigh ? p[key] >= l : p[key] <= l))?.day ?? null
}
