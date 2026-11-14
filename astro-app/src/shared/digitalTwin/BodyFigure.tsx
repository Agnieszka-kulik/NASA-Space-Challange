import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Status } from '../../features/admin/data/parameters'
import { SYSTEMS, type SystemId } from './knowledge'
import './BodyFigure.css'

export interface CardInfo {
  label: string
  value: string
  unit: string
  /** recent values for the mini sparkline */
  spark?: number[]
}

interface Props {
  statuses: Partial<Record<SystemId, Status>>
  cards: Partial<Record<SystemId, CardInfo>>
  selected: SystemId | null
  onSelect: (id: SystemId) => void
  /** beats per minute – the heart pulses at this rate */
  heartRate?: number
  /** forecast mode – violet hologram, cards show predictions */
  forecastMode?: boolean
}

const COLOR: Record<Status | 'none', string> = { ok: '#2dd4bf', warning: '#f5b83d', critical: '#ff5a5f', none: '#64748b' }
const STATUS_TEXT: Record<Status | 'none', string> = { ok: 'NOMINAL', warning: 'WARNING', critical: 'CRITICAL', none: '—' }
const SHORT: Record<SystemId, string> = {
  brain: 'BRAIN · MIND',
  eyes: 'EYES · VISION',
  heart: 'HEART',
  lungs: 'LUNGS',
  immune: 'IMMUNE',
  metabolism: 'METABOLISM',
  muscles: 'MUSCLES',
  bones: 'BONES',
  radiation: 'RADIATION',
}

// stage geometry: figure (400×820) sits in the middle of a 1000×860 stage
const FX = 300
const FY = 20
const CARD_W = 236
const CARD_H = 88

/** where each organ is on the figure + where its data card sits on the stage */
const LAYOUT: Record<SystemId, { anchor: [number, number]; side: 'L' | 'R'; y: number }> = {
  brain: { anchor: [200, 46], side: 'L', y: 30 },
  radiation: { anchor: [163, 205], side: 'L', y: 150 },
  lungs: { anchor: [176, 236], side: 'L', y: 270 },
  metabolism: { anchor: [180, 294], side: 'L', y: 390 },
  bones: { anchor: [161, 500], side: 'L', y: 560 },
  eyes: { anchor: [214, 75], side: 'R', y: 40 },
  heart: { anchor: [218, 236], side: 'R', y: 190 },
  immune: { anchor: [252, 298], side: 'R', y: 340 },
  muscles: { anchor: [240, 470], side: 'R', y: 500 },
}

// right half of the body outline (viewer's right), from the top of the head to the crotch;
// the left half is the same path mirrored
const HALF =
  'M200 22 C226 22 240 44 240 72 C240 98 228 116 216 122 L216 138 C232 146 262 150 286 160 C302 168 308 186 308 206 ' +
  'L316 300 C320 330 326 380 330 420 L334 470 C340 490 336 512 324 516 C314 518 312 500 312 488 L306 470 ' +
  'C300 430 294 380 290 340 L282 250 C280 232 276 222 272 218 C268 260 262 300 256 330 C254 350 262 370 268 392 ' +
  'C274 430 268 500 262 560 C258 600 262 640 258 690 C254 730 250 760 252 780 C256 792 262 800 248 804 L216 804 ' +
  'C210 800 214 786 216 776 C216 740 212 700 212 660 C212 620 214 590 212 560 C208 500 206 450 204 412 C203 406 201 406 200 410'
const MIRROR = 'translate(400 0) scale(-1 1)'

export default function BodyFigure({ statuses, cards, selected, onSelect, heartRate = 64, forecastMode = false }: Props) {
  const [hover, setHover] = useState<SystemId | null>(null)
  const st = (id: SystemId): Status | 'none' => statuses[id] ?? 'none'
  const c = (id: SystemId) => COLOR[st(id)]
  const active = (id: SystemId) => selected === id || hover === id
  const beat = `${(60 / heartRate).toFixed(2)}s`

  const handlers = (id: SystemId) => ({
    role: 'button',
    tabIndex: 0,
    onClick: () => onSelect(id),
    onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onSelect(id),
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover(null),
  })

  /** organ group, coloured by its system status */
  const organ = (id: SystemId, children: ReactNode, extra = '') => (
    <g
      className={`ho ho--${st(id)} ${active(id) ? 'ho--active' : ''} ${extra}`}
      style={{ ['--c' as string]: c(id) }}
      aria-label={SYSTEMS.find((s) => s.id === id)!.name}
      {...handlers(id)}
    >
      {children}
    </g>
  )

  return (
    <div className={`holo ${forecastMode ? 'holo--forecast' : ''}`}>
      <svg viewBox="0 0 1000 860" className="holo__svg">
        <defs>
          <radialGradient id="h-bg" cx="50%" cy="55%" r="55%">
            <stop offset="0" stopColor="rgba(0,245,212,0.16)" />
            <stop offset="0.6" stopColor="rgba(0,120,160,0.05)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="h-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="rgba(0,245,212,0.35)" />
            <stop offset="1" stopColor="rgba(0,245,212,0)" />
          </linearGradient>
          <linearGradient id="h-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(94,234,212,0.20)" />
            <stop offset="1" stopColor="rgba(14,116,144,0.10)" />
          </linearGradient>
          <linearGradient id="h-scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(0,245,212,0)" />
            <stop offset="0.5" stopColor="rgba(0,245,212,0.55)" />
            <stop offset="1" stopColor="rgba(0,245,212,0)" />
          </linearGradient>
          <pattern id="h-mesh" width="14" height="9" patternUnits="userSpaceOnUse">
            <path d="M14 0H0V9" fill="none" stroke="rgba(94,234,212,0.16)" strokeWidth="0.7" />
          </pattern>
          <filter id="h-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="h-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <clipPath id="h-body">
            <path d={HALF + ' L200 22 Z'} />
            <path d={HALF + ' L200 22 Z'} transform={MIRROR} />
          </clipPath>
        </defs>

        {/* ---------- stage background ---------- */}
        <rect width="1000" height="860" fill="url(#h-bg)" />
        <g className="holo__orbits" transform={`translate(${FX} ${FY})`}>
          <ellipse cx="200" cy="420" rx="250" ry="70" transform="rotate(-18 200 420)" />
          <ellipse cx="200" cy="360" rx="230" ry="60" transform="rotate(14 200 360)" />
          <ellipse cx="200" cy="300" rx="190" ry="40" transform="rotate(-4 200 300)" />
        </g>

        {/* ---------- platform ---------- */}
        <g className="holo__platform" transform={`translate(${FX} ${FY})`}>
          <path d="M40 812 L150 260 L250 260 L360 812 Z" fill="url(#h-beam)" opacity="0.28" filter="url(#h-soft)" />
          <ellipse cx="200" cy="808" rx="190" ry="34" className="ring ring--outer" />
          <ellipse cx="200" cy="808" rx="150" ry="26" className="ring ring--spin" />
          <ellipse cx="200" cy="808" rx="112" ry="19" className="ring ring--spin2" />
          <ellipse cx="200" cy="808" rx="70" ry="11" className="ring ring--core" />
          <ellipse cx="200" cy="808" rx="150" ry="26" fill="rgba(0,245,212,0.12)" filter="url(#h-soft)" />
        </g>

        {/* ---------- leader lines ---------- */}
        {SYSTEMS.map((s) => {
          const L = LAYOUT[s.id]
          const ax = FX + L.anchor[0]
          const ay = FY + L.anchor[1]
          const cx = L.side === 'L' ? 10 + CARD_W : 1000 - 10 - CARD_W
          const cy = L.y + CARD_H / 2
          const elbow = L.side === 'L' ? Math.min(ax - 40, FX + 60) : Math.max(ax + 40, FX + 340)
          const d = `M${ax} ${ay} L${elbow} ${ay} L${cx} ${cy}`
          return (
            <g key={`l-${s.id}`} className={`lead ${active(s.id) ? 'lead--active' : ''}`} style={{ ['--c' as string]: c(s.id) }}>
              <path d={d} className="lead__line" />
              <path d={d} className="lead__flow" />
              <circle cx={ax} cy={ay} r="4" className="lead__dot" />
              <circle cx={cx} cy={cy} r="3" className="lead__end" />
            </g>
          )
        })}

        {/* ---------- the hologram body ---------- */}
        <g transform={`translate(${FX} ${FY})`}>
          {/* body shell */}
          <g className="holo__shell">
            <path d={HALF + ' L200 22 Z'} fill="url(#h-skin)" />
            <path d={HALF + ' L200 22 Z'} fill="url(#h-skin)" transform={MIRROR} />
          </g>
          <g clipPath="url(#h-body)">
            <rect width="400" height="820" fill="url(#h-mesh)" />
            <g className="holo__contours">
              {Array.from({ length: 34 }, (_, i) => (
                <ellipse key={i} cx="200" cy={40 + i * 23} rx="140" ry="6" />
              ))}
            </g>
            <rect className="holo__scan" x="0" y="-40" width="400" height="40" fill="url(#h-scan)" />
          </g>
          <g className="holo__outline" filter="url(#h-glow)">
            <path d={HALF} />
            <path d={HALF} transform={MIRROR} />
          </g>

          {/* skeleton */}
          {organ(
            'bones',
            <g className="skel">
              <ellipse cx="200" cy="64" rx="31" ry="37" />
              <ellipse cx="187" cy="72" rx="7" ry="6" />
              <ellipse cx="213" cy="72" rx="7" ry="6" />
              <path d="M200 80 L196 90 L204 90 Z" />
              <path d="M178 92 Q200 124 222 92" />
              {Array.from({ length: 29 }, (_, i) => (
                <rect key={i} x="195" y={132 + i * 9.3} width="10" height="6" rx="2" />
              ))}
              <rect x="196" y="176" width="8" height="74" rx="3" />
              {[0, 1].map((m) => (
                <g key={m} transform={m ? MIRROR : undefined}>
                  <path d="M204 160 Q242 150 284 166" />
                  {Array.from({ length: 7 }, (_, i) => {
                    const y = 182 + i * 15
                    return <path key={i} d={`M204 ${y} C238 ${y - 8} 262 ${y + 4} ${262 - i * 2} ${y + 28} C${258 - i * 2} ${y + 36} 246 ${y + 34} 236 ${y + 26}`} />
                  })}
                  <path d="M204 372 C230 360 262 362 266 382 C268 402 250 414 232 410 C222 420 210 418 204 412" />
                  <circle cx="243" cy="404" r="6" />
                  <path d="M292 182 L302 324" />
                  <circle cx="302" cy="328" r="5" />
                  <path d="M302 334 L318 462 M308 334 L326 460" />
                  <path d="M322 470 L318 506 M326 470 L326 510 M330 468 L334 504" />
                  <path className="skel__long" d="M240 410 L236 560" />
                  <circle cx="236" cy="568" r="7" />
                  <path className="skel__long" d="M236 578 L234 770" />
                  <path d="M246 582 L244 764" />
                  <path d="M232 778 L250 800 M240 776 L256 798" />
                </g>
              ))}
            </g>,
          )}

          {/* muscles */}
          {organ(
            'muscles',
            <g className="musc">
              {[0, 1].map((m) => (
                <g key={m} transform={m ? MIRROR : undefined}>
                  <ellipse cx="296" cy="250" rx="11" ry="38" transform="rotate(-6 296 250)" />
                  <ellipse cx="316" cy="390" rx="9" ry="44" transform="rotate(-8 316 390)" />
                  <ellipse cx="238" cy="472" rx="20" ry="64" />
                  <ellipse cx="240" cy="650" rx="13" ry="44" />
                  <path d="M262 176 C276 180 286 196 288 214" />
                </g>
              ))}
            </g>,
          )}

          {organ(
            'brain',
            <g>
              <path className="org" d="M172 60 C168 34 188 24 200 30 C212 24 232 34 228 60 C222 68 178 68 172 60 Z" />
              <path className="org__line" d="M184 42 Q192 48 188 56 M200 32 L200 62 M214 40 Q208 48 214 56 M178 52 Q186 52 190 46 M222 52 Q214 52 210 46" />
              <circle className="spark" cx="190" cy="44" r="1.6" />
              <circle className="spark spark--2" cx="212" cy="50" r="1.6" />
            </g>,
          )}

          {organ(
            'eyes',
            <g>
              <ellipse className="org" cx="187" cy="74" rx="6.5" ry="4.5" />
              <ellipse className="org" cx="213" cy="74" rx="6.5" ry="4.5" />
              <circle className="org__fill" cx="187" cy="74" r="1.8" />
              <circle className="org__fill" cx="213" cy="74" r="1.8" />
            </g>,
          )}

          {organ(
            'lungs',
            <g className="lungs">
              {[0, 1].map((m) => (
                <g key={m} transform={m ? MIRROR : undefined}>
                  <path className="org" d="M210 178 C234 172 254 192 256 234 C258 264 248 282 232 284 C216 284 210 270 210 248 Z" />
                  <path className="org__line" d="M210 196 Q226 206 232 228 M222 212 L240 214 M226 236 L246 250" />
                </g>
              ))}
            </g>,
          )}

          {organ(
            'heart',
            <g className="heart" style={{ animationDuration: beat }}>
              <path className="org" d="M204 228 C204 216 220 214 222 226 C224 214 240 216 240 228 C240 244 222 254 222 264 C222 254 204 244 204 228 Z" />
              <path className="org__line" d="M214 222 L214 212 M228 220 Q232 210 240 210" />
            </g>,
          )}

          {organ(
            'metabolism',
            <g>
              <path className="org" d="M156 284 C176 270 210 276 214 292 C210 306 186 314 164 308 C154 302 152 292 156 284 Z" />
              <path className="org" d="M214 288 C234 280 248 292 244 310 C240 326 222 328 214 318 C208 308 210 296 214 288 Z" />
              <ellipse className="org org--soft" cx="200" cy="352" rx="40" ry="26" />
              <path className="org__line" d="M172 344 Q186 334 200 344 Q214 354 228 344 M176 358 Q190 368 204 358 Q218 348 226 360" />
            </g>,
          )}

          {organ(
            'immune',
            <g>
              <ellipse className="org" cx="252" cy="298" rx="7" ry="12" />
              <ellipse className="org" cx="200" cy="168" rx="7" ry="5" />
              {[
                [186, 128],
                [214, 128],
                [132, 214],
                [268, 214],
                [182, 408],
                [218, 408],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} className="node" cx={x} cy={y} r="4" />
              ))}
            </g>,
          )}

          {organ(
            'radiation',
            <g className="badge">
              <rect x="152" y="192" width="22" height="26" rx="4" />
              <text x="163" y="210" textAnchor="middle">
                ☢
              </text>
            </g>,
          )}
        </g>

        {/* ---------- data cards ---------- */}
        {SYSTEMS.map((s) => {
          const L = LAYOUT[s.id]
          const x = L.side === 'L' ? 10 : 1000 - 10 - CARD_W
          const info = cards[s.id]
          const status = st(s.id)
          return (
            <g
              key={`c-${s.id}`}
              className={`card card--${status} ${active(s.id) ? 'card--active' : ''}`}
              transform={`translate(${x} ${L.y})`}
              style={{ ['--c' as string]: COLOR[status] }}
              aria-label={`${s.name} details`}
              {...handlers(s.id)}
            >
              <path className="card__bg" d={`M0 0 H${CARD_W - 14} L${CARD_W} 14 V${CARD_H} H14 L0 ${CARD_H - 14} Z`} />
              <rect className="card__bar" x="0" y="10" width="3" height={CARD_H - 34} />
              <text className="card__title" x="14" y="20">
                {s.icon} {SHORT[s.id]}
              </text>
              <text className="card__status" x={CARD_W - 12} y="20" textAnchor="end">
                {STATUS_TEXT[status]}
              </text>
              {info ? (
                <>
                  <text className="card__value" x="14" y="56">
                    {info.value}
                    <tspan className="card__unit" dx="5">
                      {info.unit}
                    </tspan>
                  </text>
                  <text className="card__label" x="14" y="76">
                    {info.label}
                  </text>
                  {info.spark && info.spark.length > 1 && <Spark values={info.spark} x={CARD_W - 86} y={34} w={74} h={30} />}
                </>
              ) : (
                <text className="card__label" x="14" y="56">
                  No long-term forecast for this system
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function Spark({ values, x, y, w, h }: { values: number[]; x: number; y: number; w: number; h: number }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${x + (i / (values.length - 1)) * w},${y + h - ((v - min) / span) * h}`)
  const last = pts[pts.length - 1].split(',')
  return (
    <g className="card__spark">
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx="4" />
      <polyline points={pts.join(' ')} />
      <circle cx={last[0]} cy={last[1]} r="2.6" />
    </g>
  )
}
