import type { DuckPresetId } from '../components/PixelDuck'

export interface NasaMedicalDoc {
  id: string
  protocolCode: string
  title: string
  category: 'mental' | 'physical' | 'app'
  keywords: string[]
  normalRange?: string
  clinicalContent: string
  countermeasures: string
  recommendedMood: DuckPresetId
}

export interface RetrievedRagResult {
  doc: NasaMedicalDoc
  score: number
}

export interface RagQueryAnalysis {
  retrievedDocs: RetrievedRagResult[]
  vitalSignAlert: string | null
  suggestedMood: DuckPresetId
  followUps: string[]
}

/**
 * Local Offline NASA Spaceflight Medical & Operational Knowledge Base (RAG Corpus)
 * Based on NASA-STD-3001 (Spaceflight Human-System Standard) & ISS Medical Checklist.
 */
export const NASA_MEDICAL_CORPUS: NasaMedicalDoc[] = [
  {
    id: 'cv-bp',
    protocolCode: 'NASA-STD-3001-CV-01',
    title: 'Cardiovascular Adaptation & Orbital Blood Pressure',
    category: 'physical',
    keywords: [
      'blood',
      'pressure',
      'bp',
      'systolic',
      'diastolic',
      'mmhg',
      'hypertension',
      'hypotension',
      'heart',
      'pulse',
      'bpm',
      'tachycardia',
      'dizzy',
      'faint',
      'orthostatic',
    ],
    normalRange: 'BP: 90/60 – 120/80 mmHg | Resting HR: 55 – 78 BPM',
    clinicalContent:
      'In microgravity, cephalad fluid shift moves ~1.5–2.0 liters of intravascular and interstitial fluid from the lower extremities toward the thorax and head within the first 48 hours. Baroreceptor unloading induces diuresis, reducing total blood plasma volume by 10–15%. Elevated BP (>135/85 mmHg) may indicate sympathetic stress, high cabin CO2, or sodium retention; low BP (<90/60 mmHg) indicates hypovolemia/dehydration and increases orthostatic intolerance risk.',
    countermeasures:
      'Measure cuffed brachial blood pressure after 5 minutes of seated/floating rest. Maintain at least 2.0L (8 pouches) of daily water intake, perform daily ARED/CV exercise, and avoid Valsalva straining without proper breathing.',
    recommendedMood: 'saturn',
  },
  {
    id: 'neuro-sans',
    protocolCode: 'ISS-MED-SANS-04',
    title: 'Spaceflight-Associated Neuro-Ocular Syndrome (SANS) & Vision',
    category: 'physical',
    keywords: [
      'eye',
      'eyes',
      'vision',
      'sight',
      'blur',
      'blurry',
      'sans',
      'optic',
      'snellen',
      'focus',
      'headache',
      'cranial',
      'pressure',
      'retina',
    ],
    normalRange: 'Visual Acuity: 20/20 (6/6) | No Amsler grid distortion',
    clinicalContent:
      'SANS affects ~60% of long-duration astronauts due to chronic cephalad venous congestion and mild intracranial pressure elevation in 0G. Clinical findings include optic disc edema, globe flattening, choroidal folds, and hyperopic (farsighted) refractive shifts (+0.50 to +1.50 D).',
    countermeasures:
      'Perform weekly Snellen chart acuity and Amsler grid metamorphopsia checks at 3 meters. Keep cabin CO2 below 3.0 mmHg, use tunable "Space Anticipation Glasses" if hyperopic shift occurs, and log any visual flashes or persistent frontal headaches.',
    recommendedMood: 'bezNoza',
  },
  {
    id: 'renal-hydration',
    protocolCode: 'ISS-RENAL-HYD-02',
    title: 'Renal Stone Prevention, Hydration & Weekly Urinalysis',
    category: 'physical',
    keywords: [
      'water',
      'drink',
      'hydrate',
      'hydration',
      'thirst',
      'thirsty',
      'urine',
      'pee',
      'kidney',
      'stone',
      'calcium',
      'ph',
      'dehydration',
      'dehydrated',
    ],
    normalRange: 'Water Intake: ≥2.0 L/day (8 glasses) | Urine SG: 1.005–1.020 | pH: 6.0–7.2',
    clinicalContent:
      'Microgravity unloading triggers osteoclast bone resorption, releasing calcium and phosphate into blood and urine (hypercalciuria). Combined with reduced plasma volume and low urinary citrate, astronauts face a high risk of calcium oxalate and calcium phosphate renal stones.',
    countermeasures:
      'Consume at least 8 × 250 ml water pouches (2.0 L/day) to keep urine specific gravity <1.020. Complete weekly colorimetric urinalysis (leukocytes, nitrites, protein, pH, glucose, ketones, SG). Potassium citrate supplementation is indicated if urinary pH drops below 5.8.',
    recommendedMood: 'cool',
  },
  {
    id: 'msk-ared',
    protocolCode: 'ISS-EX-ARED-03',
    title: 'Musculoskeletal Countermeasures (ARED, COLBERT & CEVIS)',
    category: 'physical',
    keywords: [
      'workout',
      'exercise',
      'ared',
      'treadmill',
      'colbert',
      'cevis',
      'bike',
      'muscle',
      'bone',
      'osteoporosis',
      'sore',
      'strength',
      'squat',
      'deadlift',
      'recovery',
    ],
    normalRange: 'Daily Exercise: 90–120 min | HR Recovery (2 min post): >25 BPM drop',
    clinicalContent:
      'Without mechanical loading, astronauts lose 1.0–1.5% of bone mineral density (BMD) per month in the lumbar spine, femoral neck, and pelvis, alongside up to 20% loss in soleus/quadriceps muscle mass.',
    countermeasures:
      'Perform daily resistance training on the Advanced Resistive Exercise Device (ARED vacuum cylinders: squats, deadlifts, heel raises) plus cardiovascular interval training on the COLBERT treadmill (with bungee harness loading) or CEVIS cycle ergometer. Check 2-minute heart rate recovery index after each session.',
    recommendedMood: 'cool',
  },
  {
    id: 'psych-bhp',
    protocolCode: 'ISS-PSYCH-BHP-01',
    title: 'Behavioral Health & Performance (BHP): Stress, Isolation & Mood',
    category: 'mental',
    keywords: [
      'stress',
      'stressed',
      'anxious',
      'anxiety',
      'panic',
      'overwhelmed',
      'sad',
      'depressed',
      'lonely',
      'isolation',
      'home',
      'earth',
      'family',
      'mood',
      'mental',
      'cry',
      'burnout',
      'breath',
      'breathing',
      'relax',
    ],
    normalRange: 'Mood Score: ≥3/5 | Stress Index (HRV): <45/100',
    clinicalContent:
      'Confined, isolated extreme environments (ICE) and high mission tempo can trigger sympathetic nervous system overdrive, cognitive fatigue, homesickness, and "third-quarter phenomenon" mood dips during orbital missions.',
    countermeasures:
      '1) Perform autonomic Box Breathing (4s inhale – 4s hold – 4s exhale – 4s hold) for 2 minutes to increase vagal HRV tone. 2) Log honest mood in the daily Mood Tracker. 3) Take 15 minutes of Earth-observation downtime at the Cupola window. 4) Schedule private family video conferences (Ku-Band uplink) or crew movie nights.',
    recommendedMood: 'zSerduszkiem',
  },
  {
    id: 'sleep-circadian',
    protocolCode: 'ISS-SLEEP-CIRC-09',
    title: 'Circadian Desynchrony, Sleep Architecture & Fatigue Management',
    category: 'mental',
    keywords: [
      'sleep',
      'sleeping',
      'insomnia',
      'tired',
      'exhausted',
      'fatigue',
      'nap',
      'rem',
      'circadian',
      'wake',
      'night',
      'bed',
      'melatonin',
    ],
    normalRange: 'Sleep Duration: 7.0 – 8.5 hrs/24h | Deep + REM: >35% of sleep',
    clinicalContent:
      'Orbital spacecraft experience 16 sunrises and sunsets every 24 hours (one orbit every 90 minutes). Coupled with lack of gravitational proprioceptive cues and 50+ dB ventilation noise, astronauts average 6.0 hours of fragmented sleep, impairing working memory and reaction time.',
    countermeasures:
      'Switch Solid-State Lighting Assemblies (SSLA) to blue-depleted 2700K warm spectrum 60 minutes pre-sleep. Secure sleeping bag restraint straps tightly against the torso to provide comforting deep-pressure proprioception. Wear acoustic foam earplugs and avoid caffeine within 8 hours of scheduled sleep.',
    recommendedMood: 'zmeczona',
  },
  {
    id: 'env-radiation-air',
    protocolCode: 'ISS-ENV-RAD-02',
    title: 'Cabin Atmosphere (O2/CO2), Acoustics & Ionizing Radiation Dosimetry',
    category: 'physical',
    keywords: [
      'radiation',
      'msv',
      'solar',
      'cosmic',
      'oxygen',
      'o2',
      'co2',
      'carbon',
      'noise',
      'db',
      'decibel',
      'hearing',
      'audiometry',
      'ears',
      'sensor',
      'cabin',
      'temperature',
      'fever',
    ],
    normalRange: 'Cabin O2: 19.5–23.1% | Radiation: <1.0 mSv/day | Cabin Noise: <60 dB(A) | Body Temp: 36.1–37.2 °C',
    clinicalContent:
      'Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE) expose LEO crews to ~0.35–0.55 mSv/day (~150x Earth surface background). Meanwhile, localized CO2 pockets form in microgravity due to lack of natural convection, causing headaches and lethargy above 4 mmHg. Continuous ECLSS fan noise (~52 dB) risks temporary threshold shift in hearing.',
    countermeasures:
      'Monitor continuous cabin sensors in the Statistics tab. If SPE radiation alarm triggers (>1.0 mSv/day), relocate to heavily shielded polyethylene crew quarters. Perform weekly pure-tone audiometry (250–8000 Hz) and daily infrared tympanic temperature checks.',
    recommendedMood: 'kosmita',
  },
  {
    id: 'hema-blood-neuro',
    protocolCode: 'ISS-HEMA-BLOOD-07',
    title: 'Spaceflight Anemia, Capillary Blood Profile & Cognitive Reflexes',
    category: 'physical',
    keywords: [
      'capillary',
      'hemoglobin',
      'hematocrit',
      'glucose',
      'anemia',
      'finger',
      'lancet',
      'reflex',
      'memory',
      'cognitive',
      'minigame',
      'brain',
      'reaction',
    ],
    normalRange: 'Hemoglobin: 13.5–17.5 g/dL | Fasting Glucose: 70–99 mg/dL | Reflex RT: 190–270 ms',
    clinicalContent:
      'Spaceflight hemolysis increases red blood cell destruction by ~50% in microgravity ("space anemia"), while microgravity insulin resistance can alter fasting blood glucose. Cognitive alertness (reaction time and sequential working memory) is sensitive to sleep debt and CO2 levels.',
    countermeasures:
      'Perform weekly ring-finger capillary blood micro-sampling using the portable i-STAT analyzer. Complete daily Reflex and Sequential Memory cognitive minigames (use the 🎲 Randomize button for varied cognitive drills) to track neuro-vestibular processing speed.',
    recommendedMood: 'saturn',
  },
  {
    id: 'app-duck-gamification',
    protocolCode: 'ASTRO-HUD-MANUAL-01',
    title: 'Automatic OLED Duck Companion, Points System & Crew Leaderboard',
    category: 'app',
    keywords: [
      'duck',
      'app',
      'how',
      'point',
      'points',
      'shop',
      'reward',
      'rewards',
      'leaderboard',
      'rank',
      'knife',
      'custom',
      'todo',
      'checklist',
      'guide',
      'stats',
      'watch',
    ],
    normalRange: 'Daily Score Target: ≥70% | Reward Tiers: 80 – 250 PTS',
    clinicalContent:
      'The Telemetry Dashboard gamifies medical adherence in isolated space habitats. The 48×52 OLED Pixel Duck automatically calculates your Daily Wellness Score from 3 live inputs: 1) Completed daily/weekly TODO measurements & minigames, 2) Daily water hydration progress (8 glasses), and 3) Logged Mood Tracker state.',
    countermeasures:
      'Earn +1 to +4 pts per measurement, workout, minigame, or glass of water. If your compliance drops below 40% or you uncheck tasks, the Duck switches to warning states (Pixel Knife / Offended). Points can be redeemed in the Rewards Shop for real orbital morale items (Freeze-Dried Berry Bar 80 pts, Space Espresso 95 pts, Movie Night 160 pts, Fresh Veggie Lettuce 190 pts, Private Ku-Band Earth Video Call 250 pts).',
    recommendedMood: 'zNozem',
  },
]

/**
 * Tokenize and normalize text for fast local BM25 / TF-IDF retrieval
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
}

/**
 * Local RAG Retriever: ranks NASA medical documents against the user query
 * using keyword boosting + token overlap + clinical vital sign pattern matching.
 */
export function retrieveNasaMedicalDocs(
  query: string,
  topK = 2
): RagQueryAnalysis {
  const qLower = query.toLowerCase().trim()
  const tokens = tokenize(qLower)

  let vitalSignAlert: string | null = null
  let forcedDocId: string | null = null
  let suggestedMood: DuckPresetId = 'zSerduszkiem'

  // 1. Clinical Numerical Vital Sign Parser (Blood Pressure, Temperature, SpO2, Sleep)
  const bpMatch = qLower.match(/(\d{2,3})\s*\/\s*(\d{2,3})/)
  if (bpMatch) {
    const sys = Number(bpMatch[1])
    const dia = Number(bpMatch[2])
    forcedDocId = 'cv-bp'
    if (sys >= 135 || dia >= 85) {
      vitalSignAlert = `CLINICAL ALERT [NASA-STD-3001-CV-01]: Measured BP ${sys}/${dia} mmHg is ELEVATED above the nominal orbital range (90/60–120/80 mmHg). Recommend 5-minute seated/floating rest, Box Breathing, hydration check, and repeat measurement.`
      suggestedMood = 'pytajaca'
    } else if (sys < 90 || dia < 60) {
      vitalSignAlert = `CLINICAL NOTE [NASA-STD-3001-CV-01]: Measured BP ${sys}/${dia} mmHg is LOW (hypotensive range <90/60 mmHg). In microgravity, this typically reflects plasma volume depletion / dehydration. Recommend consuming 250–500 ml water with electrolytes.`
      suggestedMood = 'zmeczona'
    } else {
      vitalSignAlert = `CLINICAL ASSESSMENT [NASA-STD-3001-CV-01]: Measured BP ${sys}/${dia} mmHg is NOMINAL and within target astronaut range (90/60–120/80 mmHg).`
      suggestedMood = 'zSerduszkiem'
    }
  }

  const tempMatch = qLower.match(/\b(3[5-9](?:\.\d)?|40(?:\.\d)?)\s*(?:c|°c|deg|temp)?\b/)
  if (tempMatch && (qLower.includes('temp') || qLower.includes('fever') || qLower.includes('°c') || qLower.includes('.')) && !bpMatch) {
    const temp = Number(tempMatch[1])
    if (temp >= 35 && temp <= 41) {
      forcedDocId = 'env-radiation-air'
      if (temp > 37.3) {
        vitalSignAlert = `CLINICAL ALERT [ISS-ENV-RAD-02]: Body temperature ${temp} °C is ELEVATED (hyperthermia/fever >37.2 °C). Avoid ARED workout, hydrate immediately, and log in Daily Measurements.`
        suggestedMood = 'zmeczona'
      } else if (temp < 36.0) {
        vitalSignAlert = `CLINICAL NOTE [ISS-ENV-RAD-02]: Body temperature ${temp} °C is slightly below nominal (36.1–37.2 °C). Re-verify tympanic sensor placement.`
        suggestedMood = 'pytajaca'
      } else {
        vitalSignAlert = `CLINICAL ASSESSMENT [ISS-ENV-RAD-02]: Body temperature ${temp} °C is NOMINAL (36.1–37.2 °C).`
        suggestedMood = 'cool'
      }
    }
  }

  // 2. Score every document in NASA_MEDICAL_CORPUS
  const scored: RetrievedRagResult[] = NASA_MEDICAL_CORPUS.map((doc) => {
    let score = 0

    if (doc.id === forcedDocId) {
      score += 25
    }

    for (const kw of doc.keywords) {
      if (qLower.includes(kw)) {
        score += kw.length >= 5 ? 6 : 4
      }
    }

    const docTextLower = `${doc.title} ${doc.clinicalContent} ${doc.countermeasures}`.toLowerCase()
    for (const tok of tokens) {
      if (tok.length >= 3 && docTextLower.includes(tok)) {
        score += 1.5
      }
    }

    return { doc, score }
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const retrievedDocs =
    scored.length > 0
      ? scored.slice(0, topK)
      : [
          { doc: NASA_MEDICAL_CORPUS[4], score: 1 }, // Behavioral Health
          { doc: NASA_MEDICAL_CORPUS[8], score: 1 }, // HUD Manual
        ]

  // 3. Determine best OLED Duck Mood
  if (!vitalSignAlert) {
    if (
      qLower.includes('skip') ||
      qLower.includes('lazy') ||
      qLower.includes("don't want") ||
      qLower.includes('dont want') ||
      qLower.includes('refuse') ||
      qLower.includes('knife')
    ) {
      suggestedMood = 'groznaZNozem'
    } else if (retrievedDocs[0]) {
      suggestedMood = retrievedDocs[0].doc.recommendedMood
    }
  }

  // 4. Contextual follow-up prompts
  const primaryCat = retrievedDocs[0]?.doc.category ?? 'mental'
  const followUps =
    primaryCat === 'mental'
      ? [
          'Guide me through Box Breathing (NASA-BHP)',
          'Why do astronauts sleep poorly in orbit?',
          'How many points do I need for an Earth video call?',
        ]
      : primaryCat === 'physical'
        ? [
            'My blood pressure is 128/82, is that nominal?',
            'Why does microgravity cause kidney stones & SANS?',
            'How does ARED exercise protect my bones?',
          ]
        : [
            'What is my current daily score and hydration?',
            'What happens if I skip my checklist tasks?',
            'How do smartwatch and cabin sensors work?',
          ]

  return {
    retrievedDocs,
    vitalSignAlert,
    suggestedMood,
    followUps,
  }
}

/**
 * Builds the System Prompt for WebLLM injecting the retrieved NASA RAG documents
 * and the astronaut's live telemetry.
 */
export function buildWebLlmRagPrompt(
  analysis: RagQueryAnalysis,
  telemetry: {
    points: number
    waterGlasses: number
    waterGoal: number
    overallScorePercent: number
  }
): string {
  const ragContextBlocks = analysis.retrievedDocs
    .map(
      (r, idx) =>
        `[DOC ${idx + 1}: ${r.doc.protocolCode} — ${r.doc.title}]\n` +
        `Normal Range: ${r.doc.normalRange ?? 'N/A'}\n` +
        `Clinical Facts: ${r.doc.clinicalContent}\n` +
        `NASA Countermeasures: ${r.doc.countermeasures}`
    )
    .join('\n\n')

  return `You are the onboard AI Duck Medical & Wellness Companion for an astronaut on a space station.
Speak in friendly, concise, supportive English (max 3-4 sentences). Occasionally say "Quack!".
When the user asks about health, medicine, spaceflight, vitals, or how the dashboard works, ground your advice in the Retrieved NASA Medical RAG Protocols and Live Telemetry below and cite the protocol code (e.g. [${analysis.retrievedDocs[0]?.doc.protocolCode}]). If the user asks any other general, casual, or creative question, answer it naturally and helpfully in character as their friendly space duck companion!

LIVE ASTRONAUT TELEMETRY:
- Daily Wellness Score: ${telemetry.overallScorePercent}%
- Hydration Today: ${telemetry.waterGlasses}/${telemetry.waterGoal} glasses (${(telemetry.waterGlasses * 0.25).toFixed(2)}L / ${(telemetry.waterGoal * 0.25).toFixed(1)}L)
- Current Reward Points: ${telemetry.points} PTS
${analysis.vitalSignAlert ? `- VITAL SIGN EVALUATION: ${analysis.vitalSignAlert}\n` : ''}
RETRIEVED NASA MEDICAL RAG PROTOCOLS:
${ragContextBlocks}`
}

/**
 * Instant Local Offline RAG Synthesizer (used when WebLLM is not yet loaded or as instant fallback)
 * Synthesizes an accurate medical response directly from the retrieved NASA RAG docs + live telemetry.
 */
export function synthesizeOfflineRagReply(
  userQuery: string,
  analysis: RagQueryAnalysis,
  telemetry: {
    points: number
    waterGlasses: number
    waterGoal: number
    overallScorePercent: number
  }
): string {
  const q = userQuery.toLowerCase().trim()

  if (
    q.includes('skip') ||
    q.includes('lazy') ||
    q.includes("don't want") ||
    q.includes('dont want') ||
    q.includes('refuse')
  ) {
    return `Quack?! 🔪 Put that thought right out of the airlock! According to [ISS-EX-ARED-03] and [ASTRO-HUD-MANUAL-01], skipping daily resistance workouts and medical checks leads to 1.5% monthly bone loss in microgravity—and forces me to hold my pixel knife on your monitor! Complete at least one task right now to boost your ${telemetry.overallScorePercent}% daily score!`
  }

  if (q.includes('joke') || q.includes('funny')) {
    return `Quack-quack! 🦆 Why did the astronaut duck love [ISS-PSYCH-BHP-01]? Because floating in zero-G makes every featherweight joke 100% lighter! 🚀 Your current wellness score is ${telemetry.overallScorePercent}%—keep smiling, Commander!`
  }

  if (
    q.includes('my score') ||
    q.includes('how am i doing') ||
    q.includes('how many points') ||
    q.includes('current daily score')
  ) {
    const needed = Math.max(0, 80 - telemetry.points)
    return `Quack! 📊 Based on your live telemetry ([ASTRO-HUD-MANUAL-01] & [ISS-RENAL-HYD-02]): your Daily Wellness Score is ${telemetry.overallScorePercent}%, your hydration is at ${telemetry.waterGlasses}/${telemetry.waterGoal} glasses (${(telemetry.waterGlasses * 0.25).toFixed(2)}L), and your balance is ${telemetry.points} PTS. ${
      needed > 0
        ? `Earn ${needed} more points from your TODO checklist to claim the Freeze-Dried Berry Energy Bar (80 pts)!`
        : `You have enough points to claim a reward in the Shop!`
    }`
  }

  const topDoc = analysis.retrievedDocs[0]?.doc
  if (!topDoc) {
    return `Quack! 🦆 I searched our local NASA medical database. Your current score is ${telemetry.overallScorePercent}% and hydration is ${telemetry.waterGlasses}/${telemetry.waterGoal} glasses. Ask me about blood pressure, SANS vision, ARED workouts, radiation, sleep, or stress!`
  }

  const parts: string[] = []
  if (analysis.vitalSignAlert) {
    parts.push(`🦆 ${analysis.vitalSignAlert}`)
  } else {
    parts.push(`Quack! 🦆 According to NASA protocol [${topDoc.protocolCode}] (${topDoc.title}): ${topDoc.clinicalContent}`)
  }

  parts.push(
    `✅ Recommended Countermeasure: ${topDoc.countermeasures}${
      topDoc.normalRange ? ` (Nominal target: ${topDoc.normalRange}).` : ''
    }`
  )

  if (topDoc.id === 'renal-hydration') {
    parts.push(
      `💧 Live Status: You have logged ${telemetry.waterGlasses}/${telemetry.waterGoal} glasses (${(telemetry.waterGlasses * 0.25).toFixed(2)}L) today.`
    )
  }

  return parts.join('\n\n')
}
