import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm'
import PixelDuck, { DUCK_SPRITES, type DuckPresetId } from './PixelDuck'
import {
  retrieveNasaMedicalDocs,
  buildWebLlmRagPrompt,
  synthesizeOfflineRagReply,
} from '../services/nasaMedicalRag'

export interface DuckChatProps {
  points?: number
  waterGlasses?: number
  waterGoal?: number
  overallScorePercent?: number
  selectedMood?: string
}

interface RagCitation {
  code: string
  title: string
}

interface ChatMessage {
  id: string
  sender: 'duck' | 'user'
  text: string
  time: string
  duckMood?: DuckPresetId
  followUps?: string[]
  ragCitations?: RagCitation[]
  engineUsed?: 'WebLLM + NASA RAG' | 'Local NASA RAG'
}

interface QuickPrompt {
  id: string
  category: 'mental' | 'physical' | 'app'
  label: string
  question: string
}

const WEBLLM_MODELS = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    label: 'SmolLM2-360M (Ultra-Fast · ~250 MB)',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama-3.2-1B (High Accuracy · ~650 MB)',
  },
]

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'm-stress',
    category: 'mental',
    label: '😟 Feeling stressed or overwhelmed',
    question: 'I feel stressed and overwhelmed by today’s mission schedule. How do I calm down?',
  },
  {
    id: 'm-sleep',
    category: 'mental',
    label: '😴 Trouble sleeping in crew quarters',
    question: 'Why is it hard to sleep in orbit and how can I improve my circadian rhythm?',
  },
  {
    id: 'm-isolation',
    category: 'mental',
    label: '🌍 Missing home & Earth',
    question: 'I feel isolated and miss my family on Earth today.',
  },
  {
    id: 'p-vitals',
    category: 'physical',
    label: '🩺 Check Blood Pressure (138/88 mmHg)',
    question: 'My blood pressure reading today is 138/88 mmHg. Is that nominal in microgravity?',
  },
  {
    id: 'p-workout',
    category: 'physical',
    label: '🏋️ ARED & bone loss prevention',
    question: 'Why do we lose bone mass in space and how does ARED exercise prevent it?',
  },
  {
    id: 'p-eyes',
    category: 'physical',
    label: '👁️ Vision changes (SANS) & radiation',
    question: 'What is SANS eye syndrome and how do we monitor cosmic radiation and cabin CO2?',
  },
  {
    id: 'a-duck',
    category: 'app',
    label: '🦆 How does the Duck Monitor work?',
    question: 'How does the automatic OLED Duck Monitor change moods and why does it have a knife?',
  },
  {
    id: 'a-points',
    category: 'app',
    label: '🎁 My live score, hydration & Shop',
    question: 'What is my current daily score, hydration status, and how many points do I have for the shop?',
  },
  {
    id: 'a-blood',
    category: 'physical',
    label: '🩸 Space anemia & capillary blood checks',
    question: 'Why do astronauts perform weekly capillary blood and urine tests?',
  },
]

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

  // WebLLM state
  const [selectedModelId, setSelectedModelId] = useState<string>(WEBLLM_MODELS[0].id)
  const [webLlmStatus, setWebLlmStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [webLlmProgressText, setWebLlmProgressText] = useState<string>(
    'Local NASA Medical RAG is active (9 clinical protocols indexed). Load WebLLM to enable in-browser neural generation via WebGPU.'
  )
  const [webLlmProgressPct, setWebLlmProgressPct] = useState<number>(0)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const engineRef = useRef<MLCEngine | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'duck',
      text: `Hello Commander! 🦆 I am your offline AI Duck Companion powered by our Local NASA Medical RAG Knowledge Base (NASA-STD-3001 & ISS Medical Checklist).\n\nYour live telemetry: Daily Score ${overallScorePercent}%, Hydration ${waterGlasses}/${waterGoal} glasses, Balance ${points} PTS.\nAsk me any medical, psychological, or app question—or click "⚡ Load WebLLM in Browser" on the left to run a local neural LLM 100% offline via WebGPU!`,
      time: 'Now',
      duckMood: 'zSerduszkiem',
      engineUsed: 'Local NASA RAG',
      ragCitations: [
        { code: 'NASA-STD-3001-CV-01', title: 'Cardiovascular & BP Standard' },
        { code: 'ISS-PSYCH-BHP-01', title: 'Behavioral Health & Performance' },
      ],
      followUps: [
        'My blood pressure is 138/88 mmHg, is that okay?',
        'What is my current daily score and hydration?',
        'Why do we lose bone mass and how does ARED help?',
      ],
    },
  ])

  const messagesBoxRef = useRef<HTMLDivElement | null>(null)

  // Ensure the page itself is at the top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
    const spaceEl = document.querySelector('.space')
    if (spaceEl) {
      spaceEl.scrollTop = 0
    }
  }, [])

  // Scroll ONLY inside the internal chat messages container when messages update
  useEffect(() => {
    if (messages.length <= 1) return
    const el = messagesBoxRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const handleInitWebLlm = async () => {
    if (webLlmStatus === 'loading') return
    try {
      setWebLlmStatus('loading')
      setWebLlmProgressPct(2)
      setWebLlmProgressText('Checking WebGPU & initializing local WebLLM engine...')

      const engine = await CreateMLCEngine(selectedModelId, {
        initProgressCallback: (report) => {
          setWebLlmProgressText(report.text)
          if (typeof report.progress === 'number') {
            setWebLlmProgressPct(Math.max(5, Math.round(report.progress * 100)))
          }
        },
      })

      engineRef.current = engine
      setWebLlmStatus('ready')
      setWebLlmProgressPct(100)
      setWebLlmProgressText(`WebLLM (${selectedModelId.split('-Instruct')[0]}) running 100% offline in browser GPU + NASA RAG!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setWebLlmStatus('error')
      setWebLlmProgressText(
        `WebGPU/WebLLM unavailable (${msg.slice(0, 90)}). Continuing seamlessly with Local Offline NASA RAG Engine!`
      )
    }
  }

  const sendUserMessage = async (userText: string) => {
    if (isGenerating) return
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    // Step 1: Run Local NASA Medical RAG Retrieval (< 2ms in browser memory)
    const ragAnalysis = retrieveNasaMedicalDocs(userText, 2)
    setDuckMood(ragAnalysis.suggestedMood)

    const citations: RagCitation[] = ragAnalysis.retrievedDocs.map((r) => ({
      code: r.doc.protocolCode,
      title: r.doc.title,
    }))

    const userMsgId = `u-${Date.now()}`
    const duckMsgId = `d-${Date.now() + 1}`

    // Step 2: Check if WebLLM neural engine is loaded in browser
    if (webLlmStatus === 'ready' && engineRef.current) {
      setIsGenerating(true)
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: 'user',
          text: userText,
          time: now,
        },
        {
          id: duckMsgId,
          sender: 'duck',
          text: '🦆 Retrieving NASA RAG protocols & generating via local WebLLM...',
          time: now,
          duckMood: ragAnalysis.suggestedMood,
          ragCitations: citations,
          engineUsed: 'WebLLM + NASA RAG',
          followUps: ragAnalysis.followUps,
        },
      ])

      try {
        const systemPrompt = buildWebLlmRagPrompt(ragAnalysis, {
          points,
          waterGlasses,
          waterGoal,
          overallScorePercent,
        })

        const chunks = await engineRef.current.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userText },
          ],
          temperature: 0.35,
          max_tokens: 220,
          stream: true,
        })

        let streamedText = ''
        for await (const chunk of chunks) {
          const delta = chunk.choices[0]?.delta?.content || ''
          streamedText += delta
          const currentText = streamedText
          setMessages((prev) =>
            prev.map((m) =>
              m.id === duckMsgId
                ? {
                    ...m,
                    text: currentText || '...',
                  }
                : m
            )
          )
        }
      } catch {
        // Fallback to local RAG synthesis if WebLLM stream fails
        const fallbackReply = synthesizeOfflineRagReply(userText, ragAnalysis, {
          points,
          waterGlasses,
          waterGoal,
          overallScorePercent,
        })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === duckMsgId
              ? {
                  ...m,
                  text: fallbackReply,
                  engineUsed: 'Local NASA RAG',
                }
              : m
          )
        )
      } finally {
        setIsGenerating(false)
      }
      return
    }

    // Step 3: Instant Local Offline NASA RAG Synthesizer (works immediately without waiting for download)
    const ragReplyText = synthesizeOfflineRagReply(userText, ragAnalysis, {
      points,
      waterGlasses,
      waterGoal,
      overallScorePercent,
    })

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
        time: now,
      },
      {
        id: duckMsgId,
        sender: 'duck',
        text: ragReplyText,
        time: now,
        duckMood: ragAnalysis.suggestedMood,
        ragCitations: citations,
        engineUsed: 'Local NASA RAG',
        followUps: ragAnalysis.followUps,
      },
    ])
  }

  const handleSelectPrompt = (prompt: QuickPrompt) => {
    void sendUserMessage(prompt.question)
  }

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isGenerating) return
    const userText = inputValue.trim()
    setInputValue('')
    void sendUserMessage(userText)
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
        <div className="live-telemetry-badges">
          <span className="live-badge">
            <span className="user-live-dot" /> LOCAL NASA RAG CORPUS: 9 PROTOCOLS ONLINE
          </span>
          <span className="live-badge">
            🧠 AI ENGINE: {webLlmStatus === 'ready' ? 'WEBLLM (WEBGPU) + RAG' : 'INSTANT LOCAL RAG'}
          </span>
        </div>
      </div>

      <h1 className="user-subpage__title">Talk with Your AI Duck Companion (Local WebLLM + NASA RAG)</h1>
      <p className="user-subpage__subtitle">
        100% offline-capable space medical assistant. Every question retrieves official NASA-STD-3001 / ISS protocols and combines them with your live telemetry.
      </p>

      <div className="duck-chat-layout">
        {/* Left sidebar: Live OLED Duck + WebLLM Loader + Topic Starters */}
        <aside className="hud-card duck-chat-sidebar">
          <div className="duck-chat-sidebar__avatar">
            <PixelDuck presetId={duckMood} scale={3.2} />
            <div className="duck-chat-sidebar__status">
              AI Duck Mood: <strong style={{ color: currentSpriteMeta.color }}>{currentSpriteMeta.label}</strong>
            </div>
          </div>

          {/* Local WebLLM + RAG Control Box */}
          <div className="webllm-control-box">
            <div className="webllm-control-box__header">
              <span className="webllm-control-box__title">⚡ OFFLINE BROWSER AI (WebLLM)</span>
              <span className={`webllm-status-pill webllm-status-pill--${webLlmStatus}`}>
                {webLlmStatus === 'ready'
                  ? 'WebGPU Ready'
                  : webLlmStatus === 'loading'
                    ? `Loading ${webLlmProgressPct}%`
                    : 'RAG Standby'}
              </span>
            </div>

            <select
              className="webllm-model-select"
              value={selectedModelId}
              disabled={webLlmStatus === 'loading'}
              onChange={(e) => setSelectedModelId(e.target.value)}
            >
              {WEBLLM_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            {webLlmStatus !== 'ready' && (
              <button
                type="button"
                className="webllm-load-btn"
                disabled={webLlmStatus === 'loading'}
                onClick={() => void handleInitWebLlm()}
              >
                {webLlmStatus === 'loading'
                  ? `⏳ Downloading to Browser Cache (${webLlmProgressPct}%)...`
                  : '⚡ Load WebLLM Model in Browser'}
              </button>
            )}

            {webLlmStatus === 'loading' && (
              <div className="webllm-progress-bar">
                <div
                  className="webllm-progress-bar__fill"
                  style={{ width: `${webLlmProgressPct}%` }}
                />
              </div>
            )}

            <p className="webllm-control-box__hint">{webLlmProgressText}</p>
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
            <span className="duck-chat-prompts__title">Suggested NASA RAG queries:</span>
            {filteredPrompts.map((p) => (
              <button
                key={p.id}
                type="button"
                className="duck-prompt-btn"
                disabled={isGenerating}
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
                      <div className="chat-bubble__meta-right">
                        {msg.engineUsed && (
                          <span className="chat-engine-tag">{msg.engineUsed}</span>
                        )}
                        <span>{msg.time}</span>
                      </div>
                    </div>

                    {msg.ragCitations && msg.ragCitations.length > 0 && (
                      <div className="chat-rag-citations">
                        <span className="chat-rag-citations__label">📚 RAG Retrieved:</span>
                        {msg.ragCitations.map((cit) => (
                          <span key={cit.code} className="chat-rag-badge" title={cit.title}>
                            {cit.code}
                          </span>
                        ))}
                      </div>
                    )}

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
                        disabled={isGenerating}
                        onClick={() => void sendUserMessage(fText)}
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
              disabled={isGenerating}
              placeholder='Ask any medical/space question or type vital signs e.g. "My blood pressure is 140/90" or "Body temp 37.6 C"...'
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="duck-chat-send-btn" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Send Message →'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
