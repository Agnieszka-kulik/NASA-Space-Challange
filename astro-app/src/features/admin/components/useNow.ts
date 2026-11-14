import { useEffect, useState } from 'react'

/** Current time that re-renders the component every `intervalMs` (for countdowns) */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Seconds left until a message reaches its recipient */
export const remainingSec = (sentAt: number, delaySec: number, now: number, timeScale: number) =>
  Math.max(0, delaySec - ((now - sentAt) / 1000) * timeScale)
