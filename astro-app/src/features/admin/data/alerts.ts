// Builds the medical alert queue from the latest measurements.
import type { SeriesPoint } from './mockData'
import { CREW } from './mockData'
import { PARAMETERS, type Status } from './parameters'

export interface Alert {
  id: string
  /** null = station-wide (environment) alert */
  astronautId: string | null
  paramId: string
  value: number
  status: Exclude<Status, 'ok'>
  timestamp: string | null
}

export interface SentMessage {
  id: string
  alertId: string | null
  kind: 'recommendation' | 'exam' | 'scenario' | 'earth'
  /** display name of the recipient */
  to: string
  text: string
  sentAt: number
  delaySec: number
  /** created from the scenario simulator (what-if), not from real data */
  sim?: boolean
  /** Earth consult: show the earliest possible reply (round trip) */
  replyExpected?: boolean
}

const latest = (series: SeriesPoint[]) => [...series].reverse().find((p) => p.actual !== null)

export function buildAlerts(
  crewSeries: Record<string, Record<string, SeriesPoint[]>>,
  environment: Record<string, SeriesPoint[]>,
): Alert[] {
  const alerts: Alert[] = []

  for (const member of CREW) {
    for (const p of PARAMETERS.filter((x) => x.category === 'astronaut')) {
      const last = latest(crewSeries[member.id][p.id])
      if (last && last.actual !== null && last.status !== 'ok') {
        alerts.push({ id: `${member.id}:${p.id}`, astronautId: member.id, paramId: p.id, value: last.actual, status: last.status, timestamp: last.timestamp })
      }
    }
  }
  for (const p of PARAMETERS.filter((x) => x.category === 'environment')) {
    const last = latest(environment[p.id])
    if (last && last.actual !== null && last.status !== 'ok') {
      alerts.push({ id: `station:${p.id}`, astronautId: null, paramId: p.id, value: last.actual, status: last.status, timestamp: last.timestamp })
    }
  }

  // station alerts first (affect everyone), then critical before warning
  const rank = (a: Alert) => (a.status === 'critical' ? 0 : 2) + (a.astronautId === null ? 0 : 1)
  return alerts.sort((a, b) => rank(a) - rank(b))
}
