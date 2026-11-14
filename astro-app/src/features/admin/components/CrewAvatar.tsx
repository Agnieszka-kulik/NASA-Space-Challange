import type { CrewMember } from '../data/mockData'

/**
 * Illustrated crew portrait (spacesuit + face).
 * If the member has a `photo` (e.g. '/crew/a1.jpg' in /public/crew), the photo is shown instead.
 */
export default function CrewAvatar({ member }: { member: CrewMember }) {
  if (member.photo) {
    return <img className="crew__avatar crew__avatar--photo" src={member.photo} alt={member.name} />
  }

  const { skin, hair, hairStyle } = member.appearance
  const gid = `bg-${member.id}`

  return (
    <svg className="crew__avatar" viewBox="0 0 60 60" role="img" aria-label={`Portrait of ${member.name}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d3b66" />
          <stop offset="1" stopColor="#0a1528" />
        </linearGradient>
      </defs>
      <rect width="60" height="60" fill={`url(#${gid})`} />
      {/* Earth curve in the background */}
      <path d="M-5 60 Q30 38 65 60 Z" fill="#1f6fb2" opacity="0.35" />

      {/* long hair goes behind the head */}
      {hairStyle === 'long' && (
        <path d="M19 27 Q18 12 30 12 Q42 12 41 27 L42 41 Q37 38 36 32 L24 32 Q23 38 18 41 Z" fill={hair} />
      )}

      {/* spacesuit */}
      <path d="M5 60 Q7 44 30 42 Q53 44 55 60 Z" fill="#e8ecf1" />
      <path d="M5 60 Q7 44 30 42 Q53 44 55 60" fill="none" stroke="#b9c2ce" strokeWidth="0.8" />
      <rect x="17" y="51" width="6" height="4" rx="0.5" fill="#d64545" />
      <rect x="17" y="51" width="6" height="2" rx="0.5" fill="#ffffff" />
      <circle cx="41" cy="53" r="3" fill="#1f4fa3" stroke="#f5b83d" strokeWidth="0.8" />
      {/* neck + collar ring */}
      <rect x="26" y="34" width="8" height="8" rx="2" fill={skin} />
      <rect x="26" y="34" width="8" height="8" rx="2" fill="#000" opacity="0.12" />
      <ellipse cx="30" cy="43.5" rx="11" ry="3.2" fill="#3a7bd5" stroke="#244f8f" strokeWidth="0.8" />

      {/* face */}
      <ellipse cx="30" cy="26" rx="9" ry="10.5" fill={skin} />
      <circle cx="26.5" cy="26" r="1" fill="#2b2b2b" />
      <circle cx="33.5" cy="26" r="1" fill="#2b2b2b" />
      <path d="M27.5 31 Q30 32.6 32.5 31" fill="none" stroke="#6b3b2a" strokeWidth="0.9" strokeLinecap="round" />

      {/* hair on top */}
      {hairStyle === 'short' && <path d="M20.8 25 Q20 13 30 13 Q40 13 39.2 25 Q37.5 18 30 18 Q22.5 18 20.8 25 Z" fill={hair} />}
      {hairStyle === 'buzz' && <path d="M21.3 22 Q22 14.5 30 14.5 Q38 14.5 38.7 22 Q35 18.6 30 18.6 Q25 18.6 21.3 22 Z" fill={hair} />}
      {hairStyle === 'long' && <path d="M20.8 26 Q20 13 30 13 Q40 13 39.2 26 Q36 19 30 19 Q24 19 20.8 26 Z" fill={hair} />}
      {hairStyle === 'bun' && (
        <>
          <circle cx="30" cy="11.5" r="4.2" fill={hair} />
          <path d="M20.8 24 Q20 14 30 14 Q40 14 39.2 24 Q36 18.5 30 18.5 Q24 18.5 20.8 24 Z" fill={hair} />
        </>
      )}
      {hairStyle === 'curly' && (
        <g fill={hair}>
          {[
            [22, 20], [24.5, 16], [28.5, 14], [32.5, 14], [36, 16.5], [38.2, 20.5], [26.5, 18.5], [31, 17.5], [34.5, 19],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" />
          ))}
        </g>
      )}
    </svg>
  )
}
