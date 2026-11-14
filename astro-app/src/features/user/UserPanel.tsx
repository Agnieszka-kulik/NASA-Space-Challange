import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import SpaceBackground from '../../shared/components/SpaceBackground'
import { ThemeToggle } from '../../shared/theme/ThemeContext'
import PixelDuck, { DUCK_SPRITES, type DuckPresetId } from './components/PixelDuck'
import TodoAccordion, { type TodoSection } from './components/TodoAccordion'
import ShopSubpage, { type RewardItem } from './components/ShopSubpage'
import StatsSubpage, { MultiLineChart, type MoodLogEntry } from './components/StatsSubpage'
import GuideSubpage, { EXAMINATION_GUIDES } from './components/GuideSubpage'
import DuckChatSubpage from './components/DuckChatSubpage'
import './UserPanel.css'

const INITIAL_SECTIONS: TodoSection[] = [
  {
    id: 'minigames',
    title: 'Cognitive Minigames',
    subtitle: 'Reflexes, working memory, focus',
    icon: '🕹️',
    tasks: [
      {
        id: 'mg-reflex',
        label: 'Reflex minigame (Reaction time)',
        done: false,
        points: 2,
        isGame: 'reflex',
      },
      {
        id: 'mg-memory',
        label: 'Sequential memory minigame',
        done: true,
        points: 2,
        isGame: 'memory',
        placeholder: 'Score pts',
        value: '92/100',
      },
      {
        id: 'mg-focus',
        label: 'Coordination & focus test',
        done: false,
        points: 2,
        placeholder: 'Time / score',
      },
    ],
  },
  {
    id: 'daily',
    title: 'Daily Measurements',
    subtitle: 'Temperature, blood pressure, pulse, SpO2',
    icon: '🌡️',
    tasks: [
      {
        id: 'd-temp',
        label: 'Body temperature measurement',
        done: true,
        points: 1,
        placeholder: 'e.g. 36.6',
        unit: '°C',
        value: '36.6',
      },
      {
        id: 'd-bp',
        label: 'Blood pressure check',
        done: false,
        points: 2,
        placeholder: 'e.g. 120/80',
        unit: 'mmHg',
      },
      {
        id: 'd-pulse',
        label: 'Heart rate & oxygen saturation (SpO2)',
        done: false,
        points: 1,
        placeholder: 'e.g. 68 / 99%',
        unit: 'BPM',
      },
    ],
  },
  {
    id: 'weekly',
    title: 'Weekly Measurements',
    subtitle: 'Urine analysis, blood count, body mass',
    icon: '🧪',
    tasks: [
      {
        id: 'w-urine',
        label: 'Urine sample analysis (pH, specific gravity)',
        done: false,
        points: 3,
        placeholder: 'pH / status',
      },
      {
        id: 'w-blood',
        label: 'Capillary blood count (Hemoglobin)',
        done: true,
        points: 4,
        placeholder: 'Hgb result',
        unit: 'g/dL',
        value: '14.8',
      },
      {
        id: 'w-mass',
        label: 'Microgravity body mass measurement',
        done: false,
        points: 3,
        placeholder: 'e.g. 74.2',
        unit: 'kg',
      },
    ],
  },
  {
    id: 'training',
    title: 'Physical Training',
    subtitle: 'COLBERT treadmill, ARED resistance, mobility',
    icon: '🏋️',
    tasks: [
      {
        id: 't-cardio',
        label: 'Aerobic workout (Cycle / Treadmill)',
        done: false,
        points: 3,
        placeholder: 'Duration',
        unit: 'min',
      },
      {
        id: 't-strength',
        label: 'Bone-protective resistance exercise (ARED)',
        done: false,
        points: 3,
        placeholder: 'Sets',
      },
      {
        id: 't-stretch',
        label: 'Mobility & spinal decompression session',
        done: true,
        points: 2,
        placeholder: 'Status',
        value: 'Completed',
      },
    ],
  },
  {
    id: 'sensory',
    title: 'Vision & Hearing Tests',
    subtitle: 'Visual acuity test (SANS), audiometry',
    icon: '👁️',
    tasks: [
      {
        id: 's-vision',
        label: 'Visual acuity & fundus check (SANS)',
        done: false,
        points: 3,
        placeholder: 'e.g. 20/20',
      },
      {
        id: 's-hearing',
        label: 'Hearing test – cabin audiometry',
        done: false,
        points: 3,
        placeholder: 'Threshold dB',
        unit: 'dB',
      },
    ],
  },
  {
    id: 'extra',
    title: 'Additional Measurements',
    subtitle: 'Other observations, glucose, sleep, custom notes',
    icon: '➕',
    tasks: [
      {
        id: 'e-sleep',
        label: 'Subjective sleep quality in crew quarters',
        done: true,
        points: 1,
        placeholder: 'Hours',
        unit: 'h',
        value: '7.5',
      },
      {
        id: 'e-rad',
        label: 'Personal dosimeter check',
        done: false,
        points: 2,
        placeholder: 'mSv',
        unit: 'mSv',
      },
    ],
  },
]

const INITIAL_REWARDS: RewardItem[] = [
  {
    id: 'reward-bar',
    icon: '🍫',
    name: 'Special Reserve Energy Bar',
    category: 'ISS Crew Provision',
    price: 80,
    description: 'An extra chocolate-nut energy bar or freeze-dried dessert from the crew reward locker.',
    claimedCount: 0,
  },
  {
    id: 'reward-coffee',
    icon: '☕',
    name: 'Extra Space Pouch Espresso',
    category: 'Beverage Allocation',
    price: 110,
    description: 'An additional pouch of freeze-dried espresso with a one-way drinking valve.',
    claimedCount: 0,
  },
  {
    id: 'reward-movie',
    icon: '🎬',
    name: 'Unlock Feature Film on Station Server',
    category: 'Crew Quarters Leisure',
    price: 150,
    description: 'Access to a full-length movie or series episode of your choice from the onboard library.',
    claimedCount: 0,
  },
  {
    id: 'reward-music',
    icon: '🎧',
    name: 'Music Album / Audiobook Uplink',
    category: 'Earth Data Package',
    price: 180,
    description: 'Priority upload of your chosen music album or audiobook during the next comm window.',
    claimedCount: 0,
  },
  {
    id: 'reward-veggie',
    icon: '🌱',
    name: 'Fresh Lettuce Leaf from Veggie Module',
    category: 'Botany Experiment Harvest',
    price: 240,
    description: 'A rare chance to enjoy fresh greens grown inside the station botany chamber.',
    claimedCount: 0,
  },
  {
    id: 'reward-call',
    icon: '📞',
    name: 'Extra Private Video Call Slot',
    category: 'Ku-Band Satellite Link',
    price: 320,
    description: 'An additional 15 minutes of private video link with your family on Earth outside the schedule.',
    claimedCount: 0,
  },
]

const MOOD_OPTIONS: {
  id: string
  emoji: string
  label: string
  score: number
  color: string
  duckPreset: DuckPresetId
}[] = [
    { id: 'great', emoji: '😄', label: 'Great', score: 5, color: '#00f5d4', duckPreset: 'zSerduszkiem' },
    { id: 'good', emoji: '🙂', label: 'Good', score: 4, color: '#10b981', duckPreset: 'cool' },
    { id: 'neutral', emoji: '😐', label: 'Neutral', score: 3, color: '#2dd4bf', duckPreset: 'bezNoza' },
    { id: 'tired', emoji: '😟', label: 'Tired', score: 2, color: '#f59e0b', duckPreset: 'zmeczona' },
    { id: 'bad', emoji: '😠', label: 'Stressed', score: 1, color: '#ef4444', duckPreset: 'groznaZNozem' },
  ]

const INITIAL_MOOD_HISTORY: MoodLogEntry[] = [
  { id: 'm1', day: 'Mon', time: '09:00', label: 'Neutral', emoji: '😐', score: 3 },
  { id: 'm2', day: 'Tue', time: '10:15', label: 'Good', emoji: '🙂', score: 4 },
  { id: 'm3', day: 'Wed', time: '14:20', label: 'Neutral', emoji: '😐', score: 3 },
  { id: 'm4', day: 'Thu', time: '18:05', label: 'Tired', emoji: '😟', score: 2 },
  { id: 'm5', day: 'Fri', time: '11:30', label: 'Good', emoji: '🙂', score: 4 },
  { id: 'm6', day: 'Sat', time: '12:00', label: 'Great', emoji: '😄', score: 5 },
  { id: 'm7', day: 'Today', time: '08:30', label: 'Good', emoji: '🙂', score: 4 },
]

export default function UserPanel() {
  const navigate = useNavigate()
  const [sections, setSections] = useState<TodoSection[]>(INITIAL_SECTIONS)
  const [points, setPoints] = useState<number>(14)
  const [waterGlasses, setWaterGlasses] = useState<number>(5)
  const waterGoal = 8
  const [selectedMood, setSelectedMood] = useState<string>('good')
  const [moodHistory, setMoodHistory] = useState<MoodLogEntry[]>(INITIAL_MOOD_HISTORY)
  const [rewards, setRewards] = useState<RewardItem[]>(INITIAL_REWARDS)

  // Compact Popup notification + reactive duck state (displayed ABOVE Todo List)
  const [popupOpen, setPopupOpen] = useState<boolean>(true)
  const [popupData, setPopupData] = useState<{
    title: string
    message: string
    duckPreset: DuckPresetId
    time: string
    tone: 'warning' | 'success' | 'info'
  }>({
    title: 'Measurement reminder!',
    message: 'Complete your remaining daily measurements from the checklist below.',
    duckPreset: 'zNozem',
    time: 'Now',
    tone: 'warning',
  })

  const triggerPopup = (
    title: string,
    message: string,
    duckPreset: DuckPresetId,
    tone: 'warning' | 'success' | 'info' = 'info'
  ) => {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setPopupData({ title, message, duckPreset, time: now, tone })
    setPopupOpen(true)
  }

  // Compute overall wellness / task completion score (0 - 100%)
  const allTasks = sections.flatMap((s) => s.tasks)
  const completedTasksCount = allTasks.filter((t) => t.done).length
  const taskRatio = allTasks.length > 0 ? completedTasksCount / allTasks.length : 0
  const waterRatio = Math.min(1, waterGlasses / waterGoal)
  const currentMoodObj = MOOD_OPTIONS.find((m) => m.id === selectedMood) || MOOD_OPTIONS[1]
  const moodRatio = currentMoodObj.score / 5

  const overallScorePercent = Math.round(
    (taskRatio * 0.55 + waterRatio * 0.25 + moodRatio * 0.2) * 100
  )

  const getAutoDuckState = (): {
    presetId: DuckPresetId
    vitalsTag: string
    statusDesc: string
  } => {
    if (overallScorePercent < 15) {
      return {
        presetId: 'martwa',
        vitalsTag: 'CRITICAL',
        statusDesc: 'No completed measurements or hydration — critical state!',
      }
    }
    if (selectedMood === 'bad' || overallScorePercent < 28) {
      return {
        presetId: 'groznaZNozem',
        vitalsTag: 'ALERT',
        statusDesc: 'Very low results or high stress — the duck is furious!',
      }
    }
    if (selectedMood === 'tired') {
      return {
        presetId: 'zmeczona',
        vitalsTag: 'FATIGUED',
        statusDesc: 'Fatigue detected — rest is recommended after your measurements.',
      }
    }
    if (overallScorePercent < 42) {
      return {
        presetId: 'zNozem',
        vitalsTag: 'WARNING',
        statusDesc: 'You have several pending checks on your TODO list — the duck pulled out a knife!',
      }
    }
    if (overallScorePercent < 54) {
      return {
        presetId: 'obrazona',
        vitalsTag: 'BELOW NORMAL',
        statusDesc: 'The duck is grumpy — drink some water and complete your daily checks.',
      }
    }
    if (overallScorePercent < 65) {
      return {
        presetId: 'pytajaca',
        vitalsTag: 'WAITING',
        statusDesc: 'The duck is checking your progress and waiting for your next measurements.',
      }
    }
    if (overallScorePercent < 76) {
      return {
        presetId: 'bezNoza',
        vitalsTag: 'NORMAL',
        statusDesc: 'Parameters are stable — the duck put away the knife and is calmly watching.',
      }
    }
    if (overallScorePercent < 86) {
      return {
        presetId: 'saturn',
        vitalsTag: 'GOOD',
        statusDesc: 'Good results! Most of your tasks and measurements are done.',
      }
    }
    if (overallScorePercent < 94) {
      return {
        presetId: selectedMood === 'great' ? 'zSerduszkiem' : 'cool',
        vitalsTag: 'OPTIMAL',
        statusDesc: 'Great measurement discipline and hydration!',
      }
    }
    return {
      presetId: 'zSerduszkiem',
      vitalsTag: 'EXCELLENT (100%)',
      statusDesc: 'All measurements and daily goals completed!',
    }
  }

  const autoState = getAutoDuckState()
  const activeSpriteObj =
    DUCK_SPRITES.find((s) => s.id === autoState.presetId) || DUCK_SPRITES[0]

  const handleToggleTask = (sectionId: string, taskId: string, newValue?: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec
        return {
          ...sec,
          tasks: sec.tasks.map((t) => {
            if (t.id !== taskId) return t
            const nextDone = !t.done
            const delta = nextDone ? t.points : -t.points
            setPoints((p) => Math.max(0, p + delta))

            if (nextDone) {
              triggerPopup(
                `Task completed (+${t.points} pts)`,
                `Finished: "${t.label}"${newValue ? ` (${newValue})` : ''}.`,
                'zSerduszkiem',
                'success'
              )
            } else {
              triggerPopup(
                'Measurement unchecked',
                `Unchecked "${t.label}". Complete the task to improve your duck's mood!`,
                'groznaZNozem',
                'warning'
              )
            }

            return {
              ...t,
              done: nextDone,
              value: newValue !== undefined ? newValue : t.value,
            }
          }),
        }
      })
    )
  }

  const handleUpdateValue = (sectionId: string, taskId: string, value: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec
        return {
          ...sec,
          tasks: sec.tasks.map((t) => (t.id === taskId ? { ...t, value } : t)),
        }
      })
    )
  }

  const handleAddCustomTask = (label: string, value: string) => {
    const newTask = {
      id: `custom-${Date.now()}`,
      label,
      done: Boolean(value),
      points: 2,
      placeholder: 'Value',
      value,
    }
    setSections((prev) =>
      prev.map((sec) => (sec.id === 'extra' ? { ...sec, tasks: [...sec.tasks, newTask] } : sec))
    )
    if (value) {
      setPoints((p) => p + 2)
    }
    triggerPopup(
      'Added custom measurement',
      `Saved to checklist: "${label}"${value ? ` (${value}) +2 pts` : ''}.`,
      'saturn',
      'success'
    )
  }

  const handleAddWater = () => {
    setWaterGlasses((prev) => {
      const next = prev + 1
      setPoints((p) => p + 1)
      triggerPopup(
        'Hydration +250 ml (+1 pt)',
        next >= waterGoal
          ? 'Awesome! You reached 100% of your daily hydration goal! 💧'
        : `Drank a glass of water! You now have ${next} of ${waterGoal} glasses.`,
        'cool',
        'success'
      )
    return next
  })
}

const handleSelectMood = (moodObj: (typeof MOOD_OPTIONS)[number]) => {
  setSelectedMood(moodObj.id)
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  setMoodHistory((prev) => [
    ...prev,
    {
      id: `mood-${Date.now()}`,
      day: 'Today',
      time: now,
      label: moodObj.label,
      emoji: moodObj.emoji,
      score: moodObj.score,
    },
  ])
  triggerPopup(
    `Mood Tracker: ${moodObj.label}`,
    moodObj.score <= 2
        ? 'Lower mood logged in your stats — your duck companion state has been updated.'
    : 'Your mood has been saved to your history and Mood Tracker chart!',
    moodObj.duckPreset,
    moodObj.score <= 2 ? 'warning' : 'success'
    )
  }

const handleClaimReward = (item: RewardItem) => {
  if (points < item.price) return
  setPoints((p) => p - item.price)
  setRewards((prev) =>
    prev.map((r) => (r.id === item.id ? { ...r, claimedCount: r.claimedCount + 1 } : r))
  )
  triggerPopup(
    `Reward claimed: ${item.name}!`,
    `Spent ${item.price} pts. The reward has been assigned to your account.`,
    'zSerduszkiem',
    'success'
  )
}

const sortedCrew = [
  { name: 'Dr. Kowalski', points: 18, isUser: false },
  { name: 'Cmdr. Vega (You)', points, isUser: true },
  { name: 'Eng. Nowak', points: 11, isUser: false },
].sort((a, b) => b.points - a.points)

const podiumOrder = [
  { ...sortedCrew[1], place: '2ND', rankNum: 2, badge: '🥈' },
  { ...sortedCrew[0], place: 'TOP 1', rankNum: 1, badge: '👑' },
  { ...sortedCrew[2], place: '3RD', rankNum: 3, badge: '🥉' },
]

const waterPercent = Math.min(100, Math.round((waterGlasses / waterGoal) * 100))
const waterLiters = (waterGlasses * 0.25).toFixed(2)
const waterGoalLiters = (waterGoal * 0.25).toFixed(1)

return (
  <SpaceBackground>
    <div className="user-panel-shell">
      {/* HUD Header */}
      <header className="hud-topbar">
        <div className="hud-topbar__left">
          <Link to="/" className="user-back-btn">
            ← Mission Control
          </Link>
          <div className="hud-topbar__brand">
            <span className="hud-topbar__sub">MEDICAL & WELLNESS</span>
            <h1 className="hud-topbar__title">TELEMETRY DASHBOARD</h1>
          </div>
        </div>

        <div className="hud-topbar__center">
          <div className="hud-astronaut-badge">
            <span>ASTRONAUT</span>
          </div>
          <div className="hud-astronaut-line" />
        </div>

        <div className="hud-topbar__right">
          <Link to="/user" className="user-nav-link">
            Dashboard
          </Link>
          <Link to="/user/chat" className="user-nav-link">
            💬 Duck AI Chat
          </Link>
          <Link to="/user/guide" className="user-nav-link">
            📖 Task Guide
          </Link>
          <Link to="/user/shop" className="user-nav-link user-nav-link--accent">
            🎁 Shop ({points} pts)
          </Link>
          <Link to="/user/stats" className="user-nav-link">
            📊 Statistics
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <main className="hud-dashboard">
              {/* UPPER 3-COLUMN GRID */}
              <div className="hud-upper-grid">
                {/* LEFT COLUMN: Compact Pop-up Notification + Tall Expandable Todo List */}
                <section className="hud-col hud-col--left">
                  <div className={`reaction-popup-card reaction-popup-card--${popupData.tone}`}>
                    <div className="reaction-popup-card__header">
                      <span className="reaction-popup-card__badge">
                        🔔 NOTIFICATION ({popupData.time})
                      </span>
                      <button
                        type="button"
                        className="reaction-popup-card__toggle"
                        onClick={() => setPopupOpen((o) => !o)}
                      >
                        {popupOpen ? 'Hide ▲' : 'Show ▼'}
                      </button>
                    </div>

                    {popupOpen && (
                      <div className="reaction-popup-card__content">
                        <div className="reaction-popup-card__duck">
                          <PixelDuck presetId={popupData.duckPreset} scale={1.4} />
                        </div>
                        <div className="reaction-popup-card__message">
                          <h4>{popupData.title}</h4>
                          <p>{popupData.message}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <TodoAccordion
                    sections={sections}
                    onToggleTask={handleToggleTask}
                    onUpdateValue={handleUpdateValue}
                    onAddCustomTask={handleAddCustomTask}
                  />
                </section>

                {/* CENTER COLUMN: Slightly Smaller Automatic OLED Duck + Short Examination Guide Panel Below */}
                <section className="hud-col hud-col--center">
                  <div className="hud-oled-frame">
                    <span className="hud-corner hud-corner--tl" />
                    <span className="hud-corner hud-corner--tr" />
                    <span className="hud-corner hud-corner--bl" />
                    <span className="hud-corner hud-corner--br" />

                    <div className="hud-oled-frame__header">
                      <span className="hud-oled-frame__tag">AUTOMATIC DUCK MONITOR</span>
                      <span
                        className="hud-oled-frame__score"
                        style={{ color: activeSpriteObj.color, borderColor: activeSpriteObj.color }}
                      >
                        Daily score: {overallScorePercent}%
                      </span>
                    </div>

                    <div className="hud-oled-frame__screen-wrap">
                      <PixelDuck presetId={autoState.presetId} scale={5.2} />
                    </div>

                    <div className="hud-oled-frame__footer">
                      <div className="hud-oled-frame__vitals">
                        DUCK STATUS:{' '}
                        <strong style={{ color: activeSpriteObj.color }}>
                          {autoState.vitalsTag} ({activeSpriteObj.label.toUpperCase()})
                        </strong>
                      </div>
                      <p className="hud-oled-frame__desc">{autoState.statusDesc}</p>
                    </div>
                  </div>

                  {/* Short panel below duck: How to perform measurements & tasks */}
                  <div className="hud-card guide-preview-card">
                    <div className="guide-preview-card__top">
                      <div>
                        <span className="hud-section-title">
                          📖 HOW TO PERFORM MEASUREMENTS & TASKS?
                        </span>
                        <p className="guide-preview-card__sub">
                          Pick an examination to view step-by-step instructions, equipment, and healthy ranges:
                        </p>
                      </div>
                      <button
                        type="button"
                        className="guide-preview-card__open-btn"
                        onClick={() => navigate('/user/guide')}
                      >
                        Full Knowledge Base →
                      </button>
                    </div>

                    <div className="guide-preview-chips">
                      {EXAMINATION_GUIDES.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className="guide-chip-btn"
                          onClick={() => navigate(`/user/guide?topic=${g.id}`)}
                        >
                          <span>{g.icon}</span>
                          <span>{g.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* RIGHT COLUMN: AI Duck Chatbot -> Top 3 Leaderboard -> Mood Tracker -> Hydration -> Rewards Shop */}
                <section className="hud-col hud-col--right">
                  <div className="hud-card chatbot-hud-card">
                    <div className="chatbot-hud-card__top">
                      <div className="chatbot-hud-card__duck-avatar">
                        <PixelDuck presetId={autoState.presetId} scale={1.35} />
                      </div>
                      <div className="chatbot-hud-card__info">
                        <div className="chatbot-hud-card__title-row">
                          <h3 className="hud-section-title">DUCK AI COMPANION CHAT</h3>
                          <span className="chatbot-hud-card__badge">
                            <span className="user-live-dot" /> AI ONLINE
                          </span>
                        </div>
                        <p className="chatbot-hud-card__sub">
                          Talk with your duck about mental health, physical wellness, or how to use the app.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="chatbot-hud-card__open-btn"
                        onClick={() => navigate('/user/chat')}
                      >
                        💬 Talk to Duck →
                      </button>
                    </div>
                    <div className="chatbot-topic-pills">
                      <button
                        type="button"
                        className="chatbot-topic-pill"
                        onClick={() => navigate('/user/chat?topic=mental')}
                      >
                        🧠 Mental Health & Stress
                      </button>
                      <button
                        type="button"
                        className="chatbot-topic-pill"
                        onClick={() => navigate('/user/chat?topic=physical')}
                      >
                        💪 Physical Vitals & Sleep
                      </button>
                      <button
                        type="button"
                        className="chatbot-topic-pill"
                        onClick={() => navigate('/user/chat?topic=app')}
                      >
                        📱 How the App Works
                      </button>
                    </div>
                  </div>

                  <div className="hud-card leaderboard-hud-card">
                    <h3 className="hud-section-title">TOP 3 CREW WELLNESS LEADERBOARD</h3>
                    <div className="leaderboard-podium">
                      {podiumOrder.map((item) => (
                        <div
                          key={item.name}
                          className={`podium-box podium-box--rank-${item.rankNum} ${item.isUser ? 'podium-box--me' : ''
                            }`}
                        >
                          <div className="podium-box__badge">{item.badge}</div>
                          <div className="podium-box__place">{item.place}</div>
                          <div className="podium-box__name">{item.name}</div>
                          <div className="podium-box__pts">{item.points} pts</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="hud-card mood-hud-card">
                    <div className="mood-hud-card__top">
                      <h3 className="hud-section-title">MOOD TRACKER</h3>
                      <span className="mood-hud-card__count">
                        Logged in stats: {moodHistory.length}
                      </span>
                    </div>
                    <div className="mood-hud-buttons">
                      {MOOD_OPTIONS.map((m) => {
                        const isActive = selectedMood === m.id
                        return (
                          <button
                            key={m.id}
                            type="button"
                            className={`mood-hud-btn ${isActive ? 'mood-hud-btn--active' : ''}`}
                            style={{ '--mood-color': m.color } as React.CSSProperties}
                            onClick={() => handleSelectMood(m)}
                          >
                            <span className="mood-hud-btn__emoji">{m.emoji}</span>
                            <span className="mood-hud-btn__label">{m.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="hud-card hydration-hud-card">
                    <div className="hydration-hud-card__top">
                      <div>
                        <span className="hud-section-title">WATER INTAKE HYDRATION</span>
                        <div className="hydration-hud-card__sub">
                          Goal: <strong>{waterGlasses} / {waterGoal} glasses</strong> ({waterPercent}%)
                        </div>
                      </div>
                      <div className="hydration-hud-card__liters">
                        <strong>{waterLiters}L</strong> / {waterGoalLiters}L
                      </div>
                    </div>

                    <div className="hydration-hud-card__row">
                      <div className="hydration-bar-track">
                        <div
                          className="hydration-bar-fill"
                          style={{ width: `${waterPercent}%` }}
                        />
                      </div>

                      <button
                        type="button"
                        className="hydration-add-btn"
                        onClick={handleAddWater}
                        title="Add a glass of water (250 ml)"
                      >
                        <span className="hydration-add-btn__glass">🥛</span>
                        <span>+ Water (+1 pt)</span>
                      </button>
                    </div>
                  </div>

                  <div className="hud-card points-hud-card">
                    <div className="points-hud-card__left">
                      <span className="hud-section-title">YOUR POINTS & REWARDS</span>
                      <div className="points-hud-card__val">{points} PTS</div>
                      <span className="points-hud-card__hint">
                        Rewards from 80 pts (energy bar, coffee, movie, Veggie lettuce)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="points-hud-card__btn"
                      onClick={() => navigate('/user/shop')}
                    >
                      🎁 Rewards Shop →
                    </button>
                  </div>
                </section>
              </div>

              {/* BOTTOM FULL-WIDTH AVERAGED OVERALL WELLNESS & WATCH TELEMETRY CHART */}
              <section className="hud-card telemetry-bottom-card">
                <div className="telemetry-bottom-card__header">
                  <div>
                    <h3 className="hud-section-title">
                      YOUR OVERALL FITNESS & WELLBEING THIS WEEK
                    </h3>
                    <p className="telemetry-bottom-card__sub">
                      A friendly summary of how you're doing today with your health, water intake, mood, and measurements (Your score today is <strong>{overallScorePercent}%</strong>)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="telemetry-more-btn"
                    onClick={() => navigate('/user/stats')}
                  >
                    📈 View all your results, watch data & charts →
                  </button>
                </div>

                <MultiLineChart
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today (Now)']}
                  maxY={100}
                  minY={20}
                  height={165}
                  series={[
                    {
                      name: 'Your overall daily wellness (%)',
                      color: '#00f5d4',
                      data: [64, 68, 72, 66, 75, 81, overallScorePercent],
                    },
                    {
                      name: 'Your average heart rate from watch (BPM)',
                      color: '#38bdf8',
                      data: [72, 70, 74, 76, 69, 68, 71],
                    },
                  ]}
                />
              </section>
            </main>
          }
        />
        <Route
          path="/shop"
          element={
            <ShopSubpage
              points={points}
              rewards={rewards}
              onClaimReward={handleClaimReward}
            />
          }
        />
        <Route
          path="/stats"
          element={
            <StatsSubpage
              moodHistory={moodHistory}
              sections={sections}
              waterGlasses={waterGlasses}
              waterGoal={waterGoal}
            />
          }
        />
        <Route path="/guide" element={<GuideSubpage />} />
        <Route
          path="/chat"
          element={
            <DuckChatSubpage
              points={points}
              waterGlasses={waterGlasses}
              waterGoal={waterGoal}
              overallScorePercent={overallScorePercent}
              selectedMood={selectedMood}
            />
          }
        />
      </Routes>
    </div>
  </SpaceBackground>
)
}
