// Extra health indicators the digital twin tracks on top of the console parameters
// (immune system, nutrition, vision, exercise, recovery, cumulative radiation).
import type { ParamDef } from '../../features/admin/data/parameters'

export const TWIN_PARAMETERS: ParamDef[] = [
  { id: 'symptoms', label: 'Symptoms reported', unit: 'count', category: 'astronaut', baseline: 0.2, drift: 0.3, noise: 0.35, decimals: 0, thresholds: { warning: 2, critical: 4, direction: 'high' }, info: 'Daily checklist: cough, sore throat, fever, cold sores, slow-healing wounds, rash. Immune changes and viral reactivation are common in spaceflight.' },
  { id: 'bodyMass', label: 'Body mass', unit: '% of pre-flight', category: 'astronaut', baseline: 100, drift: -1.6, noise: 0.35, decimals: 1, everyDays: 7, thresholds: { warning: 97, critical: 95, direction: 'low' }, info: 'Weekly mass measurement. Losing weight in space usually means eating too little – inadequate nutrition is a known spaceflight risk.' },
  { id: 'hydration', label: 'Fluid intake', unit: 'L/day', category: 'astronaut', baseline: 2.6, drift: -0.3, noise: 0.25, decimals: 1, thresholds: { warning: 2.0, critical: 1.5, direction: 'low' }, info: 'Fluids shift toward the head in microgravity and thirst is reduced, so astronauts tend to drink too little.' },
  { id: 'nearVision', label: 'Near-vision test', unit: 'lines /10', category: 'astronaut', baseline: 9.6, drift: -0.8, noise: 0.35, decimals: 0, everyDays: 7, thresholds: { warning: 8, critical: 6, direction: 'low' }, info: 'Weekly self-test with the near-vision chart. A drop can be an early sign of SANS (spaceflight-associated neuro-ocular syndrome).' },
  { id: 'exerciseMin', label: 'Exercise (ML-detected)', unit: 'min/day', category: 'astronaut', baseline: 125, drift: -10, noise: 12, decimals: 0, thresholds: { warning: 90, critical: 45, direction: 'low' }, info: 'Minutes of aerobic/anaerobic exercise detected from wristband signals by our ACTIVITY_DETECTOR model (Random Forest).' },
  { id: 'recoveryH', label: 'Recovery time (ML)', unit: 'h', category: 'astronaut', baseline: 10, drift: 3, noise: 1.5, decimals: 1, thresholds: { warning: 18, critical: 26, direction: 'high' }, info: 'Predicted time to recover after exercise, from our RECOVERY_TIME_PREDICTOR model (uses your personal resting heart rate baseline).' },
  { id: 'radiationDose', label: 'Mission radiation dose', unit: 'mSv total', category: 'astronaut', baseline: 0, drift: 0, noise: 0, decimals: 0, thresholds: { warning: 300, critical: 480, direction: 'high' }, info: 'Cumulative dose this mission. NASA career limit: 600 mSv (NASA-STD-3001). Warning at 50%, critical at 80% of the career limit.' },
]

/** parameters whose values come from our ML models (shown with an "ML" badge) */
export const ML_PARAMS = new Set(['exerciseMin', 'recoveryH'])
