import type { ReactNode } from 'react'
import './SpaceBackground.css'

// Wspólne kosmiczne tło – można go używać też w panelach Admin i User
export default function SpaceBackground({ children }: { children: ReactNode }) {
  return (
    <div className="space">
      <div className="space__stars space__stars--small" />
      <div className="space__stars space__stars--big" />
      <div className="space__content">{children}</div>
    </div>
  )
}
