import { Link } from 'react-router-dom'

export default function CognitiveGamesSubpage() {
  return (
    <div className="user-subpage">
      <div className="user-subpage__top">
        <Link to="/user" className="user-back-btn">
          ← Back to Dashboard
        </Link>
        <div className="live-telemetry-badges">
          <span className="live-badge">
            <span className="user-live-dot" /> AURORA-7 · ASTRO COGNITIVE ESCAPE
          </span>
        </div>
      </div>

      <div
        className="hud-card"
        style={{
          padding: '0.5rem',
          overflow: 'hidden',
        }}
      >
        <iframe
          src="/game_code_v2.html"
          title="Aurora-7 Astro Cognitive Escape Minigames"
          allow="camera; microphone; fullscreen"
          style={{
            width: '100%',
            minHeight: '820px',
            border: 'none',
            borderRadius: '12px',
            display: 'block',
            background: '#050816',
          }}
        />
      </div>
    </div>
  )
}
