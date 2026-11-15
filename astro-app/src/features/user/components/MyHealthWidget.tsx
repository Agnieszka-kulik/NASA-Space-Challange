import { useMemo } from 'react'
import AstronautProfile from '../../admin/components/AstronautProfile'
import { CREW, generateAstronautSeries, latestStatus } from '../../admin/data/mockData'
import { worstStatus } from '../../admin/data/parameters'
import '../../admin/AdminPanel.css'

/** which crew member is logged in to the astronaut app (same default as the digital twin page) */
export const USER_ASTRONAUT_ID = 'a5'

/** "My health" widget: photo, live vitals, latest logs + mini digital twin linking to the 3D page */
export default function MyHealthWidget({ astronautId = USER_ASTRONAUT_ID }: { astronautId?: string }) {
  const member = CREW.find((c) => c.id === astronautId) ?? CREW[0]
  const series = useMemo(() => generateAstronautSeries(member, 42), [member])
  const status = useMemo(() => worstStatus(Object.values(series).map(latestStatus)), [series])

  return (
    <div className="hud-card my-health-card">
      <div className="my-health-card__top">
        <span className="hud-section-title">🧬 MY HEALTH · LIVE</span>
        <span className="my-health-card__hint">Smartwatch + daily logs</span>
      </div>
      <AstronautProfile member={member} series={series} status={status} ctaLabel="See more details →" />
    </div>
  )
}