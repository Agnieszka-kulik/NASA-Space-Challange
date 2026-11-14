// Where the mission is. Location changes the Earth link delay, gravity and radiation level.
// Sources (approx.): ISS ~0.5 mSv/day; lunar surface ~1.4 mSv/day (Chang'e-4 LND);
// Mars transit ~1.8 mSv/day (MSL RAD). Mars signal delay varies 4–24 min one-way.

export type LocationId = 'iss' | 'moon' | 'mars'

export interface MissionLocation {
  id: LocationId
  name: string
  full: string
  /** one-way signal delay to Earth, in seconds */
  delaySec: number
  delayNote?: string
  gravity: string
  /** average daily radiation dose, mSv/day */
  radiation: number
}

export const LOCATIONS: Record<LocationId, MissionLocation> = {
  iss: { id: 'iss', name: 'ISS', full: 'International Space Station · low Earth orbit', delaySec: 0.5, gravity: 'µg (microgravity)', radiation: 0.45 },
  moon: { id: 'moon', name: 'Moon', full: 'Lunar surface base · Artemis', delaySec: 1.3, gravity: '0.17 g', radiation: 1.4 },
  mars: { id: 'mars', name: 'Mars transit', full: 'Deep space · Earth → Mars transit', delaySec: 750, delayNote: 'varies 4–24 min', gravity: 'µg (microgravity)', radiation: 1.8 },
}

export function formatDelay(sec: number) {
  if (sec < 1) return '< 1 s'
  if (sec < 60) return `${sec.toFixed(1)} s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m} min ${s.toString().padStart(2, '0')} s`
}

export function formatCountdown(sec: number) {
  const s = Math.max(0, Math.ceil(sec))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}
