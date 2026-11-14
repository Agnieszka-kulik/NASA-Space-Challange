import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PixelDuck, { DUCK_SPRITES, type DuckPresetId } from './PixelDuck'

export interface DuckChatProps {
  points?: number
  waterGlasses?: number
  waterGoal?: number
  overallScorePercent?: number
  selectedMood?: string
}

interface ChatMessage {
  id: string
  sender: 'duck' | 'user'
  text: string
  time: string
  duckMood?: DuckPresetId
  followUps?: string[]
}

interface QuickPrompt {
  id: string
  category: 'mental' | 'physical' | 'app'
  label: string
  question: string
  answer: string
  duckMood: DuckPresetId
  followUps: string[]
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'm-stress',
    category: 'mental',
    label: '😟 Feeling stressed or overwhelmed',
    question: 'I feel stressed and overwhelmed by today’s mission schedule.',
    answer:
      'Quack 💙 Let’s pause for 30 seconds together. Try "Box Breathing" used by astronauts before EVA spacewalks: Inhale slowly for 4 seconds → Hold for 4 seconds → Exhale for 4 seconds → Hold for 4 seconds. You don’t have to finish the whole checklist at once—pick just ONE easy task first (like drinking a glass of water) and log your mood so Mission Control can ease your workload.',
    duckMood: 'zSerduszkiem',
    followUps: [
      'Guide me through a 1-minute relaxation',
      'What if I feel anxious before a spacewalk?',
      'I also have trouble sleeping',
    ],
  },
  {
    id: 'm-sleep',
    category: 'mental',
    label: '😴 Trouble sleeping in crew quarters',
    question: 'How can I improve my sleep quality in microgravity?',
    answer:
      'In orbit, the sun rises every 90 minutes, which confuses your circadian rhythm! Here is what helps: 1) Switch cabin tablets to warm/dim mode 45 min before sleep, 2) Tighten your sleeping bag strap slightly so your body feels gentle pressure (simulating a blanket on Earth), and 3) Avoid Space Pouch Espresso after 14:00 UTC. Your smartwatch tracks your REM and deep sleep automatically!',
    duckMood: 'zmeczona',
    followUps: [
      'I slept only 5 hours today',
      'Why do I feel tired even after sleeping?',
      'How do I log my sleep quality?',
    ],
  },
  {
    id: 'm-isolation',
    category: 'mental',
    label: '🌍 Missing home & Earth',
    question: 'I miss my family and life back on Earth today.',
    answer:
      'Missing Earth is one of the most human parts of spaceflight 💙 Look out the Cupola window for a few minutes if you can, or write a short voice note to home. Remember you can also redeem your points in the Rewards Shop for an Extra Private Video Call Slot (Ku-Band) or request your favorite music album uplink!',
    duckMood: 'zSerduszkiem',
    followUps: [
      'How many points do I have for a video call?',
      'Tell me a space duck joke to cheer me up!',
      'I feel a bit lonely in the cabin',
    ],
  },
  {
    id: 'p-vitals',
    category: 'physical',
    label: '🌡️ Why do we do daily & weekly checks?',
    question: 'Why are daily blood pressure, temperature, and weekly urine/blood checks so important?',
    answer:
      'In microgravity, fluids shift toward your head ("puffy face, bird legs" syndrome) and bones slowly release calcium. Daily blood pressure (healthy: 90/60 – 120/80 mmHg) and temperature (36.1 – 37.2 °C) catch early cardiovascular changes, while weekly urine test strips and capillary blood checks protect you from kidney stones and anemia!',
    duckMood: 'saturn',
    followUps: [
      'My blood pressure is 135/88, is that okay?',
      'How do I perform the capillary blood test?',
      'What is SANS eye syndrome?',
    ],
  },
  {
    id: 'p-workout',
    category: 'physical',
    label: '🏋️ ARED & treadmill workout tips',
    question: 'How does physical training protect my body in space?',
    answer:
      'Without gravity, astronauts can lose up to 1.5% of bone mass per month! Using the ARED vacuum resistance device (squats, deadlifts) and the COLBERT treadmill with a bungee harness keeps your spine, legs, and heart strong for re-entry—and gives you +3 pts while keeping me in my Cool sunglasses mood! 😎',
    duckMood: 'cool',
    followUps: [
      'My muscles are sore after ARED workout',
      'What if I skip my workout today?',
      'How much water should I drink after exercise?',
    ],
  },
  {
    id: 'p-eyes',
    category: 'physical',
    label: '👁️ Vision, headaches & space adaptation',
    question: 'Why do we test vision (SANS), hearing, and neurological reflexes?',
    answer:
      'Fluid shifts in weightlessness can increase pressure behind your eyes (Spaceflight-Associated Neuro-Ocular Syndrome — SANS) and cause mild space headaches. Meanwhile, 24/7 ventilation fans hum around 52 dB. Regular Snellen chart, audiometry, and reflex minigames ensure your nervous system stays razor-sharp!',
    duckMood: 'bezNoza',
    followUps: [
      'I have a mild headache today',
      'Cabin noise feels loud today',
      'How do the cognitive minigames work?',
    ],
  },
  {
    id: 'a-duck',
    category: 'app',
    label: '🦆 How does the Duck Monitor work?',
    question: 'How does the Duck change its appearance on the main screen?',
    answer:
      'I react 100% automatically to your live telemetry and daily habits! When you complete TODO measurements, drink water, and log a good mood, I turn Happy, Cool 😎, Cosmic, or show a Heart. If you uncheck tasks, ignore hydration, or your score drops low, I get grumpy, offended, or pull out my tiny pixel knife 🔪 to remind you!',
    duckMood: 'zNozem',
    followUps: [
      'What is my current daily score and hydration?',
      'What happens if I skip all my tasks?',
      'Show me your happiest mood!',
    ],
  },
  {
    id: 'a-points',
    category: 'app',
    label: '🎁 How do points & the Rewards Shop work?',
    question: 'How do I earn points and what can I claim in the shop?',
    answer:
      'Every completed measurement, workout, minigame, or glass of water gives you +1 to +4 points. Rewards in the Shop cost 80–250 pts because they are real station morale perks: Freeze-Dried Energy Bars (80 pts), Space Pouch Espresso (95 pts), Movie Night on the Projector (160 pts), Fresh Veggie Lettuce (190 pts), or a Private Earth Video Call (250 pts)!',
    duckMood: 'saturn',
    followUps: [
      'How many points do I have right now?',
      'What is the cheapest reward in the shop?',
      'How does the Top 3 Crew Leaderboard work?',
    ],
  },
  {
    id: 'a-stats',
    category: 'app',
    label: '📊 Where is my smartwatch & sensor data?',
    question: 'How do the Statistics and Task Guide pages work?',
    answer:
      'In the Statistics tab, your smartwatch streams live Heart Rate (BPM), Blood Oxygen (SpO₂), Resting HR, Stress Level, and Sleep Duration, while station sensors monitor Cabin O₂, Noise (dB), and Cosmic Radiation (mSv/day) 24/7. You can also click interactive tabs to switch charts between all your manual measurements!',
    duckMood: 'kosmita',
    followUps: [
      'Is radiation level safe today?',
      'How do I add a custom measurement?',
      'Where do I find step-by-step medical instructions?',
    ],
  },
]

function analyzeAndReply(
  rawInput: string,
  context: {
    points: number
    waterGlasses: number
    waterGoal: number
    overallScorePercent: number
  }
): { text: string; mood: DuckPresetId; followUps: string[] } {
  const q = rawInput.toLowerCase().trim()

  // 1. Check if the user entered blood pressure numbers like "120/80" or "140/90"
  const bpMatch = q.match(/(\d{2,3})\s*\/\s*(\d{2,3})/)
  if (bpMatch) {
    const sys = Number(bpMatch[1])
    const dia = Number(bpMatch[2])
    if (sys >= 135 || dia >= 88) {
      return {
        text: `Quack! A blood pressure reading of ${sys}/${dia} mmHg is slightly elevated above the nominal orbital range (90/60 – 120/80 mmHg). Please sit quietly for 5 minutes, take slow breaths, drink some water, and re-measure. Make sure to log this value in your "Daily Measurements" checklist so the flight surgeon can review it!`,
        mood: 'pytajaca',
        followUps: ['I feel a bit stressed too', 'How do I measure blood pressure properly?', 'What about my heart rate?'],
      }
    }
    if (sys < 90 || dia < 58) {
      return {
        text: `Hmm, ${sys}/${dia} mmHg is a bit on the low side! In microgravity, dehydration often lowers blood pressure. Right now you have ${context.waterGlasses}/${context.waterGoal} glasses of water logged—grab a 250 ml water pouch and rest for a moment!`,
        mood: 'zmeczona',
        followUps: ['How much water did I drink today?', 'I feel dizzy or tired', 'Why does microgravity affect blood pressure?'],
      }
    }
    return {
      text: `Awesome! ${sys}/${dia} mmHg is right inside the healthy astronaut target range (90/60 – 120/80 mmHg)! Don’t forget to type "${sys}/${dia}" into your Blood Pressure task on the dashboard for +2 points!`,
      mood: 'zSerduszkiem',
      followUps: ['What is a normal body temperature?', 'What is my current daily score?', 'Tell me about weekly tests'],
    }
  }

  // 2. Check if the user asks about their live status / score / points / water
  if (
    q.includes('my score') ||
    q.includes('current') ||
    q.includes('how am i doing') ||
    q.includes('how many points') ||
    q.includes('my status') ||
    q.includes('how much water did i')
  ) {
    const neededForBar = Math.max(0, 80 - context.points)
    return {
      text: `Here is your live telemetry summary: Your daily wellness score is ${context.overallScorePercent}%, you currently have ${context.points} PTS, and you’ve had ${context.waterGlasses} out of ${context.waterGoal} glasses of water today (${Math.round((context.waterGlasses / context.waterGoal) * 100)}%). ${
        neededForBar > 0
          ? `You need ${neededForBar} more points to claim the Freeze-Dried Berry Energy Bar (80 pts) in the Rewards Shop!`
          : `You already have enough points to claim a reward in the Shop!`
      }`,
      mood: context.overallScorePercent >= 70 ? 'cool' : 'saturn',
      followUps: ['How can I earn points faster?', 'What rewards are in the shop?', 'Give me a health tip for today'],
    }
  }

  // 3. Skipping tasks / laziness / rebellious user -> Knife / Offended duck!
  if (
    q.includes('skip') ||
    q.includes('lazy') ||
    q.includes("don't want") ||
    q.includes('dont want') ||
    q.includes('hate') ||
    q.includes('refuse') ||
    q.includes('no workout') ||
    q.includes('knife')
  ) {
    return {
      text: 'Quack?! 🔪 Put that thought right out of the airlock! If you skip your daily measurements or ARED workouts, your bones lose calcium in zero-G AND I will sit on your main monitor holding my pixel knife until you finish your checklist! Do at least one quick measurement right now for +2 pts!',
      mood: 'groznaZNozem',
      followUps: ['Okay, okay! Which task is the quickest?', 'Show me your friendly mood again', 'Why is workout so important?'],
    }
  }

  // 4. Joke / Humor / Cheer up / Easter egg
  if (q.includes('joke') || q.includes('funny') || q.includes('laugh') || q.includes('cheer me up') || q.includes('quack')) {
    return {
      text: 'Quack-quack! 🦆 Why did the astronaut duck bring a spacesuit to the pond? Because it wanted to explore the QUACK-uum of space! 🚀 ...Okay, my humor circuit is still in orbit, but I hope that made you smile!',
      mood: 'cool',
      followUps: ['Tell me another space fact!', 'I feel happier now', 'How do I log my mood?'],
    }
  }

  // 5. Guided relaxation / breathing exercise
  if (q.includes('breath') || q.includes('relax') || q.includes('1-minute') || q.includes('panic') || q.includes('calm')) {
    return {
      text: 'Let’s do a 3-step Orbital Reset together right now:\n1️⃣ Unclench your jaw and let your shoulders float freely in zero-G.\n2️⃣ Breathe in slowly through your nose for 4 seconds... hold for 4... and exhale softly for 6 seconds.\n3️⃣ Name 3 things you can see in the cabin right now. You are safe, capable, and doing a great job, Commander 💙',
      mood: 'zSerduszkiem',
      followUps: ['Thank you, that helped!', 'What if I feel stressed before a spacewalk?', 'How does stress affect my smartwatch stats?'],
    }
  }

  // 6. Headache / dizziness / nausea / space sickness / pain
  if (
    q.includes('headache') ||
    q.includes('dizzy') ||
    q.includes('nausea') ||
    q.includes('pain') ||
    q.includes('sore') ||
    q.includes('sick') ||
    q.includes('hurt')
  ) {
    return {
      text: 'I’m sorry you’re feeling physical discomfort! Mild headaches, sore muscles, or fluid-shift congestion are common in orbit. First: check your hydration (dehydration and slightly elevated cabin CO₂ are the #1 causes of orbital headaches) and check your body temperature. If symptoms persist, log a custom note in "Additional Tasks & Measurements" so the medical team on Earth sees it immediately.',
      mood: 'pytajaca',
      followUps: ['How do I add a custom measurement note?', 'Is cabin oxygen and CO2 normal?', 'I slept poorly last night'],
    }
  }

  // 7. Sleep duration / insomnia / fatigue
  if (q.includes('sleep') || q.includes('insomnia') || q.includes('tired') || q.includes('exhausted') || q.includes('nap') || q.includes('hours')) {
    return {
      text: 'Getting less than 6.5 hours of sleep in microgravity slows down your reaction time (you’ll notice it in the Reflex Minigame!). Try a 20-minute power nap in your crew berth, dim blue-light displays before bed, and keep cabin noise muffled with earplugs. Your smartwatch automatically logs your sleep stages to the Statistics tab.',
      mood: 'zmeczona',
      followUps: ['How does cabin noise affect me?', 'What can I do about stress?', 'Let’s check my current wellness score'],
    }
  }

  // 8. Stress / anxiety / sadness / loneliness / mental health
  if (
    q.includes('stress') ||
    q.includes('sad') ||
    q.includes('anxious') ||
    q.includes('lonely') ||
    q.includes('alone') ||
    q.includes('home') ||
    q.includes('family') ||
    q.includes('depress') ||
    q.includes('overwhelm') ||
    q.includes('mental')
  ) {
    return {
      text: 'Living in a metal habitat 400 km above Earth is mentally demanding—it is 100% okay to have tough days 💙 Please don’t bottle it up: log your honest mood in the Mood Tracker on the main screen, take a break by the viewing window, and talk to your crewmates. I’m always here in your HUD whenever you want to vent!',
      mood: 'zSerduszkiem',
      followUps: ['Guide me through a 1-minute relaxation', 'Tell me a space duck joke to cheer me up!', 'How do I book a video call to Earth?'],
    }
  }

  // 9. Radiation / Oxygen / Noise / Cabin sensors
  if (
    q.includes('radiation') ||
    q.includes('oxygen') ||
    q.includes('o2') ||
    q.includes('co2') ||
    q.includes('noise') ||
    q.includes('sensor') ||
    q.includes('cabin')
  ) {
    return {
      text: 'Station environmental sensors run 24/7! Right now in your Statistics tab: Cabin O₂ is nominal at 20.9%, Acoustic Noise is 52 dB (safe below 60 dB), and Cosmic Radiation is 0.42 mSv/day (well below the 1.0 mSv alert threshold). If a solar particle event ever occurs, the notification banner above your TODO list will alert you immediately!',
      mood: 'kosmita',
      followUps: ['What about my smartwatch vitals?', 'Why do we test hearing in space?', 'How do notifications work?'],
    }
  }

  // 10. Water / Hydration / Urine / Kidneys
  if (q.includes('water') || q.includes('drink') || q.includes('hydrat') || q.includes('thirst') || q.includes('urine')) {
    return {
      text: `Hydration is critical in microgravity because bone calcium enters the bloodstream, increasing kidney stone risk. Right now you are at ${context.waterGlasses}/${context.waterGoal} glasses (${(context.waterGlasses * 0.25).toFixed(2)}L / ${(context.waterGoal * 0.25).toFixed(1)}L). Every time you click "+ Water (+1 pt)" on the dashboard, your progress bar and points go up!`,
      mood: 'cool',
      followUps: ['How many points do I have right now?', 'Why do we do weekly urine tests?', 'What else improves my daily score?'],
    }
  }

  // 11. Workouts / ARED / Treadmill / Muscles / Bones
  if (
    q.includes('workout') ||
    q.includes('exercise') ||
    q.includes('ared') ||
    q.includes('treadmill') ||
    q.includes('muscle') ||
    q.includes('bone') ||
    q.includes('gym')
  ) {
    return {
      text: 'Your daily 2-hour exercise block (ARED resistance training + COLBERT treadmill or CEVIS cycle) prevents bone loss and keeps your heart strong for Earth gravity! Don’t forget to check your heart rate Recovery Index 2 minutes after finishing.',
      mood: 'cool',
      followUps: ['How do I check step-by-step instructions?', 'My muscles are sore after ARED workout', 'What if I skip my workout today?'],
    }
  }

  // 12. Minigames / Memory / Reflex / Randomize
  if (q.includes('game') || q.includes('minigame') || q.includes('memory') || q.includes('reflex') || q.includes('random')) {
    return {
      text: 'The Cognitive Minigames in the top section of your TODO list test your reaction time (ms), sequential working memory, and spatial focus! You can click "🎲 Randomize" on the memory game—in future mission updates it will draw from a full pool of cognitive brain-trainers.',
      mood: 'saturn',
      followUps: ['How many points do minigames give?', 'How does lack of sleep affect reflexes?', 'What is my current daily score?'],
    }
  }

  // 13. Leaderboard / Crew / Ranking
  if (q.includes('leaderboard') || q.includes('rank') || q.includes('crew') || q.includes('kowalski') || q.includes('nowak') || q.includes('top 3')) {
    return {
      text: `The Top 3 Crew Wellness Leaderboard compares your points (${context.points} pts) with Dr. Kowalski (18 pts) and Eng. Nowak (11 pts). Complete a few more measurements and glasses of water today to take the 👑 TOP 1 spot on the podium!`,
      mood: 'cool',
      followUps: ['How many points do I have right now?', 'What rewards can I buy with points?', 'How do I add a custom measurement?'],
    }
  }

  // 14. Custom task / Task Guide / How to use app
  if (
    q.includes('custom') ||
    q.includes('guide') ||
    q.includes('instruction') ||
    q.includes('how to') ||
    q.includes('how does') ||
    q.includes('blood test') ||
    q.includes('capillary')
  ) {
    return {
      text: 'You can view step-by-step instructions, required medical devices, and healthy reference ranges for every single check in the "📖 Task Guide" tab! And if you need to log an extra observation, open "Additional Tasks & Measurements" at the bottom of your TODO list and add your own entry for +2 pts.',
      mood: 'saturn',
      followUps: ['Where is my smartwatch & sensor data?', 'What is my current daily score?', 'How do points & the Rewards Shop work?'],
    }
  }

  // 15. Greetings / Thanks / Positive feedback
  if (
    q.includes('hello') ||
    q.includes('hi ') ||
    q === 'hi' ||
    q.includes('hey') ||
    q.includes('thank') ||
    q.includes('good') ||
    q.includes('great') ||
    q.includes('happy') ||
    q.includes('love')
  ) {
    return {
      text: `Quack-quack! 💙 Always happy to fly with you, Commander! Your daily wellness score is currently ${context.overallScorePercent}%. Let me know if you want to talk about stress & sleep, check a medical measurement value (try typing a blood pressure like "118/76"), or check your mission progress!`,
      mood: 'zSerduszkiem',
      followUps: [
        'What is my current daily score and hydration?',
        'My blood pressure is 118/76, is that okay?',
        'Tell me a space duck joke to cheer me up!',
      ],
    }
  }

  // Fallback: intelligent contextual prompt
  return {
    text: `Quack! 🦆 I heard you say: "${rawInput}". As your onboard AI Duck Counselor, I can analyze your blood pressure readings (e.g. type "125/82"), guide you through anti-stress breathing, explain any medical check or sensor metric, or check your live hydration (${context.waterGlasses}/${context.waterGoal}) and points (${context.points} pts). Which of these should we explore?`,
    mood: 'pytajaca',
    followUps: [
      'What is my current daily score and hydration?',
      'Guide me through a 1-minute relaxation',
      'Why do we do daily & weekly checks?',
    ],
  }
}

export default function DuckChatSubpage({
  points = 14,
  waterGlasses = 5,
  waterGoal = 8,
  overallScorePercent = 72,
}: DuckChatProps) {
  const [searchParams] = useSearchParams()
  const initialTopic = (searchParams.get('topic') as 'all' | 'mental' | 'physical' | 'app') || 'all'

  const [activeCategory, setActiveCategory] = useState<'all' | 'mental' | 'physical' | 'app'>(initialTopic)
  const [duckMood, setDuckMood] = useState<DuckPresetId>('zSerduszkiem')
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'duck',
      text: `Hello Commander! 🦆 I am your onboard AI Duck Companion. I’m connected to your live telemetry (Daily Score: ${overallScorePercent}%, Hydration: ${waterGlasses}/${waterGoal} glasses, Balance: ${points} PTS). Ask me about stress & sleep, type a measurement like "120/80" to check if it’s healthy, or ask how any feature works!`,
      time: 'Now',
      duckMood: 'zSerduszkiem',
      followUps: [
        'What is my current daily score and hydration?',
        'Guide me through a 1-minute relaxation',
        'My blood pressure is 120/80, is that okay?',
      ],
    },
  ])

  const messagesBoxRef = useRef<HTMLDivElement | null>(null)

  // Ensure the page itself is at the top on mount (fixes any stuck scroll on .space or window)
  useEffect(() => {
    window.scrollTo(0, 0)
    const spaceEl = document.querySelector('.space')
    if (spaceEl) {
      spaceEl.scrollTop = 0
    }
  }, [])

  // Scroll ONLY inside the internal chat messages container when new messages arrive
  useEffect(() => {
    if (messages.length <= 1) return
    const el = messagesBoxRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const sendUserMessage = (userText: string, presetPrompt?: QuickPrompt) => {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    if (presetPrompt) {
      setDuckMood(presetPrompt.duckMood)
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: 'user',
          text: presetPrompt.question,
          time: now,
        },
        {
          id: `d-${Date.now() + 1}`,
          sender: 'duck',
          text: presetPrompt.answer,
          time: now,
          duckMood: presetPrompt.duckMood,
          followUps: presetPrompt.followUps,
        },
      ])
      return
    }

    const reply = analyzeAndReply(userText, {
      points,
      waterGlasses,
      waterGoal,
      overallScorePercent,
    })
    setDuckMood(reply.mood)

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: userText,
        time: now,
      },
      {
        id: `d-${Date.now() + 1}`,
        sender: 'duck',
        text: reply.text,
        time: now,
        duckMood: reply.mood,
        followUps: reply.followUps,
      },
    ])
  }

  const handleSelectPrompt = (prompt: QuickPrompt) => {
    sendUserMessage(prompt.question, prompt)
  }

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    const userText = inputValue.trim()
    setInputValue('')
    sendUserMessage(userText)
  }

  const filteredPrompts =
    activeCategory === 'all'
      ? QUICK_PROMPTS
      : QUICK_PROMPTS.filter((p) => p.category === activeCategory)

  const currentSpriteMeta = DUCK_SPRITES.find((s) => s.id === duckMood) ?? DUCK_SPRITES[0]

  return (
    <div className="user-subpage">
      <div className="user-subpage__top">
        <Link to="/user" className="user-back-btn">
          ← Back to Astronaut Panel
        </Link>
        <span className="live-badge">
          <span className="user-live-dot" /> DUCK AI ASSISTANT ONLINE (MENTAL, PHYSICAL & APP HELP)
        </span>
      </div>

      <h1 className="user-subpage__title">Talk with Your AI Duck Companion</h1>
      <p className="user-subpage__subtitle">
        Chat about your mental health & stress, check your physical measurements (e.g. type your blood pressure), or learn how every part of the app works.
      </p>

      <div className="duck-chat-layout">
        {/* Left sidebar: Live OLED Duck + Topic Starters */}
        <aside className="hud-card duck-chat-sidebar">
          <div className="duck-chat-sidebar__avatar">
            <PixelDuck presetId={duckMood} scale={3.4} />
            <div className="duck-chat-sidebar__status">
              AI Duck Mood: <strong style={{ color: currentSpriteMeta.color }}>{currentSpriteMeta.label}</strong>
            </div>
          </div>

          <div className="duck-chat-categories">
            <button
              type="button"
              className={`meas-tab-btn ${activeCategory === 'all' ? 'meas-tab-btn--active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All Topics
            </button>
            <button
              type="button"
              className={`meas-tab-btn ${activeCategory === 'mental' ? 'meas-tab-btn--active' : ''}`}
              onClick={() => setActiveCategory('mental')}
            >
              🧠 Mental Health
            </button>
            <button
              type="button"
              className={`meas-tab-btn ${activeCategory === 'physical' ? 'meas-tab-btn--active' : ''}`}
              onClick={() => setActiveCategory('physical')}
            >
              💪 Physical Health
            </button>
            <button
              type="button"
              className={`meas-tab-btn ${activeCategory === 'app' ? 'meas-tab-btn--active' : ''}`}
              onClick={() => setActiveCategory('app')}
            >
              📱 How App Works
            </button>
          </div>

          <div className="duck-chat-prompts">
            <span className="duck-chat-prompts__title">Suggested conversation topics:</span>
            {filteredPrompts.map((p) => (
              <button
                key={p.id}
                type="button"
                className="duck-prompt-btn"
                onClick={() => handleSelectPrompt(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Right area: Interactive Chat Window */}
        <section className="hud-card duck-chat-window">
          <div className="duck-chat-messages" ref={messagesBoxRef}>
            {messages.map((msg) => (
              <div key={msg.id} className="chat-message-group">
                <div
                  className={`chat-bubble-row ${
                    msg.sender === 'user' ? 'chat-bubble-row--user' : 'chat-bubble-row--duck'
                  }`}
                >
                  {msg.sender === 'duck' && (
                    <div className="chat-bubble__duck-mini">
                      <PixelDuck presetId={msg.duckMood || 'zSerduszkiem'} scale={0.95} />
                    </div>
                  )}
                  <div className={`chat-bubble chat-bubble--${msg.sender}`}>
                    <div className="chat-bubble__meta">
                      <span className="chat-bubble__sender">
                        {msg.sender === 'duck' ? 'AI Duck Companion' : 'Commander (You)'}
                      </span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="chat-bubble__text" style={{ whiteSpace: 'pre-line' }}>
                      {msg.text}
                    </p>
                  </div>
                </div>

                {msg.sender === 'duck' && msg.followUps && msg.followUps.length > 0 && (
                  <div className="chat-followup-row">
                    {msg.followUps.map((fText) => (
                      <button
                        key={fText}
                        type="button"
                        className="chat-followup-chip"
                        onClick={() => sendUserMessage(fText)}
                      >
                        💬 {fText}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form className="duck-chat-input-bar" onSubmit={handleSendCustom}>
            <input
              type="text"
              className="duck-chat-input"
              placeholder='Ask about stress, sleep, workouts, app features, or type e.g. "120/80" or "Tell me a joke"...'
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="duck-chat-send-btn">
              Send Message →
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
