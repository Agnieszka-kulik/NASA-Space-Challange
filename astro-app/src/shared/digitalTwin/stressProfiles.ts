// REAL data: self-reported stress (0–10) from the
// "Wearable Device Dataset from Induced Stress and Structured Exercise Sessions" (v1.0.1),
// files Stress_Level_v1.csv / Stress_Level_v2.csv. Baseline = rest before the protocol,
// peak = highest score during the stress tasks (Stroop, TMCT, opinion talks, subtraction).
// Each crew member is calibrated on one real (anonymous) participant.

export interface StressProfile {
  /** participant id in the dataset */
  participant: string
  baseline: number
  peak: number
  /** all stages, in protocol order (for the chart) */
  stages: { stage: string; score: number }[]
}

const V1_STAGES = ['Baseline', 'Stroop', 'First Rest', 'TMCT', 'Second Rest', 'Real Opinion', 'Opposite Opinion', 'Subtract']
const V2_STAGES = ['Baseline', 'TMCT', 'First Rest', 'Real Opinion', 'Opposite Opinion', 'Second Rest', 'Subtract']

function profile(participant: string, scores: number[]): StressProfile {
  const stages = (scores.length === 8 ? V1_STAGES : V2_STAGES).map((stage, i) => ({ stage, score: scores[i] }))
  const tasks = stages.filter((s) => !/Baseline|Rest/.test(s.stage)).map((s) => s.score)
  return { participant, baseline: scores[0], peak: Math.max(...tasks), stages }
}

/** crew member id -> real participant from the dataset */
export const STRESS_PROFILES: Record<string, StressProfile> = {
  a1: profile('S17', [1, 1, 1, 2, 1, 1, 1, 1]), // Kowalska – very low reactivity
  a2: profile('S03', [3, 3, 3, 4, 3, 3, 3, 3]), // Nowak – low reactivity
  a3: profile('f04', [2, 4, 3, 3, 4, 1, 4]), // Ito – moderate
  a4: profile('S16', [3, 4, 2, 5, 3, 2, 2, 2]), // Moreau – moderate
  a5: profile('S07', [5, 6, 6, 8, 7, 8, 9, 9]), // Okafor – high baseline, high reactivity
  a6: profile('f05', [3, 4, 3, 3, 3, 2, 3]), // Larsen – low reactivity
}

export const STRESS_SOURCE =
  'Wearable Device Dataset from Induced Stress and Structured Exercise Sessions v1.0.1 (Stress_Level_v1/v2.csv, 36 participants)'

/** reactivity class used in texts and as a personal factor in forecasts */
export function stressReactivity(p: StressProfile) {
  const delta = p.peak - p.baseline
  const level = delta >= 4 || p.peak >= 8 ? 'high' : delta >= 2 ? 'moderate' : 'low'
  return { delta, level, factor: level === 'high' ? 1.4 : level === 'moderate' ? 1.1 : 0.85 }
}
