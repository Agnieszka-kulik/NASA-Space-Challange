import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import SpaceBackground from '../../shared/components/SpaceBackground'
import PixelDuck, { DUCK_SPRITES, type DuckPresetId } from './components/PixelDuck'
import TodoAccordion, { type TodoSection } from './components/TodoAccordion'
import ShopSubpage, { type RewardItem } from './components/ShopSubpage'
import StatsSubpage, { MultiLineChart, type MoodLogEntry } from './components/StatsSubpage'
import GuideSubpage, { EXAMINATION_GUIDES } from './components/GuideSubpage'
import './UserPanel.css'

const INITIAL_SECTIONS: TodoSection[] = [
  {
    id: 'minigames',
    title: 'Minigierki kognitywne',
    subtitle: 'Refleks, pamięć operacyjna, koncentracja',
    icon: '🕹️',
    tasks: [
      {
        id: 'mg-reflex',
        label: 'Minigierka na refleks (Czas reakcji)',
        done: false,
        points: 2,
        isGame: 'reflex',
      },
      {
        id: 'mg-memory',
        label: 'Minigierka na pamięć sekwencyjną',
        done: true,
        points: 2,
        isGame: 'memory',
        placeholder: 'Wynik pkt',
        value: '92/100',
      },
      {
        id: 'mg-focus',
        label: 'Test koordynacji i skupienia',
        done: false,
        points: 2,
        placeholder: 'Czas / wynik',
      },
    ],
  },
  {
    id: 'daily',
    title: 'Codzienne pomiary',
    subtitle: 'Temperatura, ciśnienie, tętno, saturacja',
    icon: '🌡️',
    tasks: [
      {
        id: 'd-temp',
        label: 'Pomiar temperatury ciała',
        done: true,
        points: 1,
        placeholder: 'np. 36.6',
        unit: '°C',
        value: '36.6',
      },
      {
        id: 'd-bp',
        label: 'Pomiar ciśnienia tętniczego',
        done: false,
        points: 2,
        placeholder: 'np. 120/80',
        unit: 'mmHg',
      },
      {
        id: 'd-pulse',
        label: 'Weryfikacja tętna i saturacji (SpO2)',
        done: false,
        points: 1,
        placeholder: 'np. 68 / 99%',
        unit: 'BPM',
      },
    ],
  },
  {
    id: 'weekly',
    title: 'Cotygodniowe pomiary',
    subtitle: 'Badanie moczu, morfologia, skład ciała',
    icon: '🧪',
    tasks: [
      {
        id: 'w-urine',
        label: 'Analiza próbki moczu (pH, ciężar właściwy)',
        done: false,
        points: 3,
        placeholder: 'pH / status',
      },
      {
        id: 'w-blood',
        label: 'Morfologia kapilarna (Hemoglobina)',
        done: true,
        points: 4,
        placeholder: 'Wynik Hgb',
        unit: 'g/dL',
        value: '14.8',
      },
      {
        id: 'w-mass',
        label: 'Pomiar masy ciała w mikrograwitacji',
        done: false,
        points: 3,
        placeholder: 'np. 74.2',
        unit: 'kg',
      },
    ],
  },
  {
    id: 'training',
    title: 'Trening fizyczny',
    subtitle: 'Bieżnia próżniowa, opór ARED, rozciąganie',
    icon: '🏋️',
    tasks: [
      {
        id: 't-cardio',
        label: 'Trening aerobowy (Rower / Bieżnia)',
        done: false,
        points: 3,
        placeholder: 'Czas trwania',
        unit: 'min',
      },
      {
        id: 't-strength',
        label: 'Ćwiczenia oporowe chroniące kości (ARED)',
        done: false,
        points: 3,
        placeholder: 'Serie',
      },
      {
        id: 't-stretch',
        label: 'Sesja mobilności i dekompresji kręgosłupa',
        done: true,
        points: 2,
        placeholder: 'Status',
        value: 'Ukończono',
      },
    ],
  },
  {
    id: 'sensory',
    title: 'Badania wzroku i słuchu',
    subtitle: 'Test ostrości wzroku, audiometria',
    icon: '👁️',
    tasks: [
      {
        id: 's-vision',
        label: 'Badanie ostrości wzroku i dna oka (SANS)',
        done: false,
        points: 3,
        placeholder: 'np. 20/20',
      },
      {
        id: 's-hearing',
        label: 'Test słuchu – audiometria kabinowa',
        done: false,
        points: 3,
        placeholder: 'Próg dB',
        unit: 'dB',
      },
    ],
  },
  {
    id: 'extra',
    title: 'Dodatkowe pomiary',
    subtitle: 'Inne obserwacje, glukoza, sen, notatki własne',
    icon: '➕',
    tasks: [
      {
        id: 'e-sleep',
        label: 'Subiektywna ocena jakości snu w kapsule',
        done: true,
        points: 1,
        placeholder: 'Godziny',
        unit: 'h',
        value: '7.5',
      },
      {
        id: 'e-rad',
        label: 'Kontrola dozymetru osobistego',
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
    name: 'Baton Energetyczny z Zapasów Specjalnych',
    category: 'Racja dodatkowa ISS',
    price: 80,
    description: 'Dodatkowy baton czekoladowo-orzechowy lub liofilizowany deser z szafki nagród załogi.',
    claimedCount: 0,
  },
  {
    id: 'reward-coffee',
    icon: '☕',
    name: 'Dodatkowa Saszetka Kawy Kosmicznej',
    category: 'Przydział napojów',
    price: 110,
    description: 'Dodatkowa porcja liofilizowanego espresso w saszetce z zaworem jednokierunkowym.',
    claimedCount: 0,
  },
  {
    id: 'reward-movie',
    icon: '🎬',
    name: 'Odblokowanie Filmu na Serwerze Stacji',
    category: 'Czas wolny w kajucie',
    price: 150,
    description: 'Dostęp do wybranego filmu pełnometrażowego lub odcinka serialu z biblioteki pokładowej.',
    claimedCount: 0,
  },
  {
    id: 'reward-music',
    icon: '🎧',
    name: 'Transfer Albumu Muzycznego / Audiobooka',
    category: 'Pakiet danych z Ziemi',
    price: 180,
    description: 'Wgranie wybranego albumu lub książki audio podczas kolejnego okna komunikacyjnego.',
    claimedCount: 0,
  },
  {
    id: 'reward-veggie',
    icon: '🌱',
    name: 'Świeży Liść Sałaty z Modułu Veggie',
    category: 'Świeża żywność z eksperymentu',
    price: 240,
    description: 'Rzadka możliwość spożycia świeżej zieleniny wyhodowanej w komorze botanicznej stacji.',
    claimedCount: 0,
  },
  {
    id: 'reward-call',
    icon: '📞',
    name: 'Dodatkowy Slot Prywatnej Wideokonferencji',
    category: 'Łącze satelitarne Ku-Band',
    price: 320,
    description: 'Dodatkowe 15 minut prywatnego połączenia wideo z rodziną na Ziemi poza grafikiem.',
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
  { id: 'great', emoji: '😄', label: 'Świetny', score: 5, color: '#00f5d4', duckPreset: 'zSerduszkiem' },
  { id: 'good', emoji: '🙂', label: 'Dobry', score: 4, color: '#10b981', duckPreset: 'cool' },
  { id: 'neutral', emoji: '😐', label: 'Neutralny', score: 3, color: '#2dd4bf', duckPreset: 'bezNoza' },
  { id: 'tired', emoji: '😟', label: 'Zmęczony', score: 2, color: '#f59e0b', duckPreset: 'zmeczona' },
  { id: 'bad', emoji: '😠', label: 'Stres / Zły', score: 1, color: '#ef4444', duckPreset: 'groznaZNozem' },
]

const INITIAL_MOOD_HISTORY: MoodLogEntry[] = [
  { id: 'm1', day: 'Pon', time: '09:00', label: 'Neutralny', emoji: '😐', score: 3 },
  { id: 'm2', day: 'Wt', time: '10:15', label: 'Dobry', emoji: '🙂', score: 4 },
  { id: 'm3', day: 'Śr', time: '14:20', label: 'Neutralny', emoji: '😐', score: 3 },
  { id: 'm4', day: 'Czw', time: '18:05', label: 'Zmęczony', emoji: '😟', score: 2 },
  { id: 'm5', day: 'Pt', time: '11:30', label: 'Dobry', emoji: '🙂', score: 4 },
  { id: 'm6', day: 'Sob', time: '12:00', label: 'Świetny', emoji: '😄', score: 5 },
  { id: 'm7', day: 'Dziś', time: '08:30', label: 'Dobry', emoji: '🙂', score: 4 },
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
    title: 'Przypomnienie o pomiarach!',
    message: 'Wykonaj pozostałe pomiary dzienne z listy poniżej.',
    duckPreset: 'zNozem',
    time: 'Teraz',
    tone: 'warning',
  })

  const triggerPopup = (
    title: string,
    message: string,
    duckPreset: DuckPresetId,
    tone: 'warning' | 'success' | 'info' = 'info'
  ) => {
    const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
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
        vitalsTag: 'KRYTYCZNY',
        statusDesc: 'Brak wykonanych pomiarów i nawodnienia — stan krytyczny!',
      }
    }
    if (selectedMood === 'bad' || overallScorePercent < 28) {
      return {
        presetId: 'groznaZNozem',
        vitalsTag: 'ALARMOWY',
        statusDesc: 'Bardzo słabe wyniki lub wysoki stres — kaczka jest wściekła!',
      }
    }
    if (selectedMood === 'tired') {
      return {
        presetId: 'zmeczona',
        vitalsTag: 'ZMĘCZENIE',
        statusDesc: 'Wykryto zmęczenie organizmu — zalecany odpoczynek po pomiarach.',
      }
    }
    if (overallScorePercent < 42) {
      return {
        presetId: 'zNozem',
        vitalsTag: 'OSTRZEŻENIE',
        statusDesc: 'Masz sporo zaległych badań na liście TODO — kaczka wyciągnęła nóż!',
      }
    }
    if (overallScorePercent < 54) {
      return {
        presetId: 'obrazona',
        vitalsTag: 'PONIŻEJ NORMY',
        statusDesc: 'Kaczka jest obrażona — uzupełnij wodę i codzienne pomiary.',
      }
    }
    if (overallScorePercent < 65) {
      return {
        presetId: 'pytajaca',
        vitalsTag: 'OCZEKIWANIE',
        statusDesc: 'Kaczka sprawdza Twoje postępy i czeka na kolejne pomiary.',
      }
    }
    if (overallScorePercent < 76) {
      return {
        presetId: 'bezNoza',
        vitalsTag: 'W NORMIE',
        statusDesc: 'Parametry stabilne — kaczka schowała nóż i spokojnie czuwa.',
      }
    }
    if (overallScorePercent < 86) {
      return {
        presetId: 'saturn',
        vitalsTag: 'DOBRY',
        statusDesc: 'Dobre wyniki! Większość zadań i pomiarów została wykonana.',
      }
    }
    if (overallScorePercent < 94) {
      return {
        presetId: selectedMood === 'great' ? 'zSerduszkiem' : 'cool',
        vitalsTag: 'OPTYMALNY',
        statusDesc: 'Świetna dyscyplina pomiarowa i nawodnienie!',
      }
    }
    return {
      presetId: 'zSerduszkiem',
      vitalsTag: 'WZOROWY (100%)',
      statusDesc: 'Wszystkie pomiary i cele dzienne zrealizowane wzorowo!',
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
                `Zadanie wykonane (+${t.points} pkt)`,
                `Ukończono: "${t.label}"${newValue ? ` (${newValue})` : ''}.`,
                'zSerduszkiem',
                'success'
              )
            } else {
              triggerPopup(
                'Cofnięto pomiar',
                `Odznaczono "${t.label}". Uzupełnij zadanie, aby poprawić stan kaczki!`,
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
      placeholder: 'Wartość',
      value,
    }
    setSections((prev) =>
      prev.map((sec) => (sec.id === 'extra' ? { ...sec, tasks: [...sec.tasks, newTask] } : sec))
    )
    if (value) {
      setPoints((p) => p + 2)
    }
    triggerPopup(
      'Dodano dodatkowy pomiar',
      `Zapisano na liście: "${label}"${value ? ` (${value}) +2 pkt` : ''}.`,
      'saturn',
      'success'
    )
  }

  const handleAddWater = () => {
    setWaterGlasses((prev) => {
      const next = prev + 1
      setPoints((p) => p + 1)
      triggerPopup(
        'Nawodnienie +250 ml (+1 pkt)',
        next >= waterGoal
          ? 'Brawo! Dzienny cel nawodnienia został w 100% osiągnięty! 💧'
          : `Wypito szklankę wody! Masz już ${next} z ${waterGoal} szklanek.`,
        'cool',
        'success'
      )
      return next
    })
  }

  const handleSelectMood = (moodObj: (typeof MOOD_OPTIONS)[number]) => {
    setSelectedMood(moodObj.id)
    const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    setMoodHistory((prev) => [
      ...prev,
      {
        id: `mood-${Date.now()}`,
        day: 'Dziś',
        time: now,
        label: moodObj.label,
        emoji: moodObj.emoji,
        score: moodObj.score,
      },
    ])
    triggerPopup(
      `Mood Tracker: ${moodObj.label}`,
      moodObj.score <= 2
        ? 'Zapisano obniżony nastrój w statystykach — stan kaczki został zaktualizowany.'
        : 'Twój nastrój został zapisany w historii i na wykresie Mood Trackera!',
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
      `Odebrano nagrodę: ${item.name}!`,
      `Wydano ${item.price} pkt. Nagroda została przypisana do Twojego konta.`,
      'zSerduszkiem',
      'success'
    )
  }

  const sortedCrew = [
    { name: 'Dr. Kowalski', points: 18, isUser: false },
    { name: 'Kmdr. Vega (Ty)', points, isUser: true },
    { name: 'Inż. Nowak', points: 11, isUser: false },
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
              <span>ASTRONAUTA</span>
            </div>
            <div className="hud-astronaut-line" />
          </div>

          <div className="hud-topbar__right">
            <Link to="/user" className="user-nav-link">
              Pulpit
            </Link>
            <Link to="/user/guide" className="user-nav-link">
              📖 Instrukcje badań
            </Link>
            <Link to="/user/shop" className="user-nav-link user-nav-link--accent">
              🎁 Sklep ({points} pkt)
            </Link>
            <Link to="/user/stats" className="user-nav-link">
              📊 Statystyki
            </Link>
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
                          🔔 POWIADOMIENIE ({popupData.time})
                        </span>
                        <button
                          type="button"
                          className="reaction-popup-card__toggle"
                          onClick={() => setPopupOpen((o) => !o)}
                        >
                          {popupOpen ? 'Ukryj ▲' : 'Pokaż ▼'}
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
                        <span className="hud-oled-frame__tag">AUTOMATYCZNY MONITOR KACZKI</span>
                        <span
                          className="hud-oled-frame__score"
                          style={{ color: activeSpriteObj.color, borderColor: activeSpriteObj.color }}
                        >
                          Ogólny stan dnia: {overallScorePercent}%
                        </span>
                      </div>

                      <div className="hud-oled-frame__screen-wrap">
                        <PixelDuck presetId={autoState.presetId} scale={5.2} />
                      </div>

                      <div className="hud-oled-frame__footer">
                        <div className="hud-oled-frame__vitals">
                          STAN KACZKI:{' '}
                          <strong style={{ color: activeSpriteObj.color }}>
                            {autoState.vitalsTag} ({activeSpriteObj.label.toUpperCase()})
                          </strong>
                        </div>
                        <p className="hud-oled-frame__desc">{autoState.statusDesc}</p>
                      </div>
                    </div>

                    {/* Krótki panel pod kaczką: Jak wykonywać badania i zadania */}
                    <div className="hud-card guide-preview-card">
                      <div className="guide-preview-card__top">
                        <div>
                          <span className="hud-section-title">
                            📖 JAK WYKONYWAĆ BADANIA I ZADANIA?
                          </span>
                          <p className="guide-preview-card__sub">
                            Wybierz badanie, aby zobaczyć instrukcję krok po kroku, sprzęt i normy:
                          </p>
                        </div>
                        <button
                          type="button"
                          className="guide-preview-card__open-btn"
                          onClick={() => navigate('/user/guide')}
                        >
                          Pełna baza wiedzy →
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

                  {/* RIGHT COLUMN: Ranking Top 3 -> Mood Tracker -> Nawodnienie -> Sklep z nagrodami */}
                  <section className="hud-col hud-col--right">
                    <div className="hud-card leaderboard-hud-card">
                      <h3 className="hud-section-title">RANKING TOP 3 NAJLEPSZYCH UŻYTKOWNIKÓW</h3>
                      <div className="leaderboard-podium">
                        {podiumOrder.map((item) => (
                          <div
                            key={item.name}
                            className={`podium-box podium-box--rank-${item.rankNum} ${
                              item.isUser ? 'podium-box--me' : ''
                            }`}
                          >
                            <div className="podium-box__badge">{item.badge}</div>
                            <div className="podium-box__place">{item.place}</div>
                            <div className="podium-box__name">{item.name}</div>
                            <div className="podium-box__pts">{item.points} pkt</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="hud-card mood-hud-card">
                      <div className="mood-hud-card__top">
                        <h3 className="hud-section-title">MOOD TRACKER (NASTRÓJ)</h3>
                        <span className="mood-hud-card__count">
                          Wpisy w statystykach: {moodHistory.length}
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
                          <span className="hud-section-title">NAWODNIENIE ORGANIZMU</span>
                          <div className="hydration-hud-card__sub">
                            Cel: <strong>{waterGlasses} / {waterGoal} szklanek</strong> ({waterPercent}%)
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
                          title="Dodaj szklankę wody (250 ml)"
                        >
                          <span className="hydration-add-btn__glass">🥛</span>
                          <span>+ Woda (+1 pkt)</span>
                        </button>
                      </div>
                    </div>

                    <div className="hud-card points-hud-card">
                      <div className="points-hud-card__left">
                        <span className="hud-section-title">TWOJE PUNKTY I NAGRODY</span>
                        <div className="points-hud-card__val">{points} PKT</div>
                        <span className="points-hud-card__hint">
                          Nagrody od 80 pkt (baton, kawa, film, sałata Veggie)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="points-hud-card__btn"
                        onClick={() => navigate('/user/shop')}
                      >
                        🎁 Sklep z nagrodami →
                      </button>
                    </div>
                  </section>
                </div>

                {/* BOTTOM FULL-WIDTH AVERAGED OVERALL WELLNESS & WATCH TELEMETRY CHART */}
                <section className="hud-card telemetry-bottom-card">
                  <div className="telemetry-bottom-card__header">
                    <div>
                      <h3 className="hud-section-title">
                        TWOJA OGÓLNA FORMA I SAMOPOCZUCIE W TYM TYGODNIU
                      </h3>
                      <p className="telemetry-bottom-card__sub">
                        Podsumowanie tego, jak dziś wyglądasz ze zdrowiem, piciem wody, nastrojem i pomiarami (Twój dzisiejszy wynik to <strong>{overallScorePercent}%</strong>)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="telemetry-more-btn"
                      onClick={() => navigate('/user/stats')}
                    >
                      📈 Zobacz wszystkie swoje wyniki, dane z zegarka i wykresy →
                    </button>
                  </div>

                  <MultiLineChart
                    labels={['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Dziś (Teraz)']}
                    maxY={100}
                    minY={20}
                    height={165}
                    series={[
                      {
                        name: 'Twoja ogólna forma w ciągu dnia (%)',
                        color: '#00f5d4',
                        data: [64, 68, 72, 66, 75, 81, overallScorePercent],
                      },
                      {
                        name: 'Twoje średnie tętno z zegarka (BPM)',
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
        </Routes>
      </div>
    </SpaceBackground>
  )
}
