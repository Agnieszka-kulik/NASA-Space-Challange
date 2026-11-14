// 📡 Mission comms channel between the Medical Officer console and the astronaut app.
// Works between two browser tabs on the same computer (BroadcastChannel) – no backend needed.
// Messages are also saved in localStorage, so the astronaut app can read them after opening later.
//
// Usage in the user panel:
//   useEffect(() => subscribe((msg) => { ... }), [])
//   const history = getMessageLog()
// Show a message only when Date.now() >= msg.deliverAt (it is "still travelling" from Earth before that).

export type MissionMessage =
  | {
      type: 'recommendation' | 'exam'
      id: string
      /** astronaut id, e.g. 'a5' */
      astronautId: string
      paramId: string
      text: string
      sentAt: number
      deliverAt: number
    }
  | {
      type: 'scenario'
      id: string
      scenarioId: string | null
      title: string
      text: string
      sentAt: number
      deliverAt: number
    }
  | {
      type: 'location'
      id: string
      locationId: string
      sentAt: number
      deliverAt: number
    }

const CHANNEL_NAME = 'duck-mission'
const STORAGE_KEY = 'duck-mission-log'
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

export function publish(msg: MissionMessage) {
  channel?.postMessage(msg)
  try {
    const log = getMessageLog()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...log, msg].slice(-100)))
  } catch {
    // storage unavailable – live channel still works
  }
}

export function getMessageLog(): MissionMessage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as MissionMessage[]
  } catch {
    return []
  }
}

/** Subscribe to new messages; returns an unsubscribe function (perfect for useEffect) */
export function subscribe(handler: (msg: MissionMessage) => void) {
  if (!channel) return () => {}
  const listener = (e: MessageEvent<MissionMessage>) => handler(e.data)
  channel.addEventListener('message', listener)
  return () => channel.removeEventListener('message', listener)
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
