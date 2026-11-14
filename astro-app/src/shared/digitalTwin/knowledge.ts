// Knowledge base of the digital twin: body systems, how spaceflight affects them, how to measure,
// when to act and what to do. Written for astronauts who are NOT medical experts.

export type SystemId = 'brain' | 'eyes' | 'heart' | 'lungs' | 'immune' | 'metabolism' | 'muscles' | 'bones' | 'radiation'
export type HazardId = 'R' | 'I' | 'D' | 'G' | 'E'

export const HAZARDS: Record<HazardId, { name: string; short: string }> = {
  R: { name: 'Space radiation', short: 'Radiation' },
  I: { name: 'Isolation & confinement', short: 'Isolation' },
  D: { name: 'Distance from Earth', short: 'Distance' },
  G: { name: 'Gravity fields', short: 'Gravity' },
  E: { name: 'Hostile closed environment', short: 'Environment' },
}

export interface Source {
  title: string
  url?: string
}

export const SOURCES = {
  hazards: { title: 'NASA HRP – The five hazards of human spaceflight (RIDGE)', url: 'https://www.nasa.gov/hrp/hazards' },
  body: { title: 'NASA – The human body in space', url: 'https://www.nasa.gov/humans-in-space/the-human-body-in-space/' },
  bone: { title: 'NASA – Risk of spaceflight-induced bone changes (1–1.5% loss / month)', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/' },
  radiation: { title: 'NASA OCHMO – Radiation protection technical brief (600 mSv career, 250 mSv per SPE)', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf' },
  sans: { title: 'NASA – SANS brief for astronaut candidates', url: 'https://ntrs.nasa.gov/citations/20220016048' },
  i4: { title: 'NASA OSDR – Inspiration4 astronaut blood & immune data', url: 'https://osdr.nasa.gov/bio/news/articles/I4-data/I4-data.html' },
  stressData: { title: 'Wearable Device Dataset from Induced Stress and Structured Exercise Sessions v1.0.1 (real stress scores)' },
  models: { title: 'Team models: ACTIVITY_DETECTOR & RECOVERY_TIME_PREDICTOR (Random Forest / sklearn pipeline, Empatica E4 signals)' },
} satisfies Record<string, Source>

export interface BodySystem {
  id: SystemId
  name: string
  organ: string
  icon: string
  /** what this part of the body does (plain language) */
  func: string
  /** what spaceflight does to it */
  spaceEffect: string
  hazards: HazardId[]
  /** twin indicator ids shown for this system */
  indicators: string[]
  /** how to take the measurement, per indicator */
  howTo: Record<string, string[]>
  whenToAct: { self: string; crew: string; ground: string }
  actions: string[]
  sources: Source[]
}

export const SYSTEMS: BodySystem[] = [
  {
    id: 'brain',
    name: 'Brain & behavioral health',
    organ: 'Brain',
    icon: '🧠',
    func: 'Controls mood, focus, memory, reaction time and sleep. Your performance in every task depends on it.',
    spaceEffect:
      'Isolation, confinement, heavy workload and disrupted light cycles raise stress and make sleep worse. Poor sleep and stress slowly degrade mood, memory and reaction time – often before you notice it yourself.',
    hazards: ['I', 'D', 'E'],
    indicators: ['mood', 'stress', 'sleep', 'reflex', 'memory'],
    howTo: {
      mood: ['Each evening, pick the face that matches your day.', 'Be honest – the twin compares it with YOUR normal, not with others.'],
      stress: ['Rate stress 0–100 in the app after your main work block.', 'The wristband EDA/heart rate is used to cross-check it.'],
      sleep: ['Wear the wristband during sleep – hours are logged automatically.', 'Add a manual entry if you slept without it.'],
      reflex: ['Open the reaction test in the app, sit still, tap as soon as the circle turns green (5 rounds).'],
      memory: ['Do the 2-minute sequence memory test at the same time of day.'],
    },
    whenToAct: {
      self: 'One bad day: use the breathing exercise, protect tonight’s sleep window.',
      crew: '3+ days of low mood or sleep < 5.5 h, or stress above your normal range → talk to the Crew Medical Officer.',
      ground: 'Thoughts of hopelessness, conflict in the crew, or no improvement after a week → private call with the flight psychologist.',
    },
    actions: [
      'Do the 10-minute guided breathing exercise',
      'Keep an 8-hour sleep window tonight (screens off 1 h before)',
      'Schedule a private call with family at the next comms window',
      'Join a crew leisure activity this evening',
    ],
    sources: [SOURCES.hazards, SOURCES.body, SOURCES.stressData],
  },
  {
    id: 'eyes',
    name: 'Eyes & vision (SANS)',
    organ: 'Eyes',
    icon: '👁',
    func: 'Vision for reading procedures, displays and fine manual work.',
    spaceEffect:
      'In microgravity, body fluids shift toward the head. This can swell the optic nerve and flatten the back of the eye (SANS), most often blurring near vision. It affects about two-thirds of long-duration astronauts.',
    hazards: ['G'],
    indicators: ['nearVision', 'symptoms'],
    howTo: {
      nearVision: ['Hold the near-vision card 40 cm from your eyes in normal cabin light.', 'Read from the top; enter the last line you can read without errors.', 'Test each eye separately, then both.'],
      symptoms: ['Report headaches, blurry near vision or seeing a “shadow” in the daily symptom checklist.'],
    },
    whenToAct: {
      self: 'Slight blur: use your space-anticipation glasses and re-test in a week.',
      crew: 'Drop of 2+ lines from your normal, or headaches with blurred vision → tell the Crew Medical Officer (fundoscopy / ultrasound of the eye).',
      ground: 'Sudden vision loss or distortion → urgent consult with flight surgeons and eye imaging (OCT).',
    },
    actions: ['Do the weekly near-vision self-test', 'Use your space-anticipation glasses for close-up work', 'Report any headaches in the daily checklist'],
    sources: [SOURCES.sans, SOURCES.body],
  },
  {
    id: 'heart',
    name: 'Heart & circulation',
    organ: 'Heart',
    icon: '❤️',
    func: 'Pumps blood – oxygen and nutrients – to every organ.',
    spaceEffect:
      'Without gravity the heart works less and fluids move up to the chest and head. Blood pressure regulation changes, and stress, poor sleep and radiation add cardiovascular strain.',
    hazards: ['G', 'R', 'I'],
    indicators: ['heartRate', 'bloodPressure'],
    howTo: {
      heartRate: ['Measured automatically by the wristband while you rest in the morning.'],
      bloodPressure: ['Sit (or stay still, strapped in) for 5 minutes before measuring.', 'Cuff on the left upper arm at heart level.', 'Take 2 readings 1 minute apart and log both.'],
    },
    whenToAct: {
      self: 'Slightly high: rest, avoid caffeine and re-measure in 30 min.',
      crew: 'Systolic ≥ 135 twice, or resting heart rate far above your normal → inform the Crew Medical Officer.',
      ground: 'Chest pain, fainting, irregular heartbeat or systolic ≥ 150 → immediate CMO care + flight surgeon consult (ECG).',
    },
    actions: ['Re-measure blood pressure after 5 min of rest', 'Skip caffeine for the rest of the day', 'Do your planned cardio session (moderate intensity)'],
    sources: [SOURCES.body, SOURCES.hazards],
  },
  {
    id: 'lungs',
    name: 'Lungs & breathing',
    organ: 'Lungs',
    icon: '🫁',
    func: 'Bring oxygen into the blood and remove CO₂.',
    spaceEffect:
      'The cabin is a closed environment: CO₂ can build up and cause headaches and fatigue. Oxygen saturation shows whether your body gets enough oxygen.',
    hazards: ['E'],
    indicators: ['spo2'],
    howTo: { spo2: ['Clip the pulse oximeter on a warm finger, stay still for 30 s, log the stable value.'] },
    whenToAct: {
      self: 'Mild headache: move to a well-ventilated module, re-measure.',
      crew: 'SpO₂ below 95% or several crew with headaches → CMO + check the cabin CO₂ readings.',
      ground: 'SpO₂ below 93%, shortness of breath → emergency procedure and flight surgeon consult.',
    },
    actions: ['Re-measure SpO₂ after 5 minutes', 'Check the cabin CO₂ display', 'Report headaches in the symptom checklist'],
    sources: [SOURCES.hazards],
  },
  {
    id: 'immune',
    name: 'Immune system',
    organ: 'Immune system',
    icon: '🛡',
    func: 'Defends the body against infections and repairs damage.',
    spaceEffect:
      'Stress, radiation and poor sleep weaken the immune system. Dormant viruses (like cold sores) can re-activate and wounds heal more slowly. Real astronaut blood data (Inspiration4) show measurable immune changes even after a 3-day flight.',
    hazards: ['R', 'I', 'E'],
    indicators: ['temperature', 'symptoms'],
    howTo: {
      temperature: ['Measured by the wristband skin sensor; confirm with the thermometer if it looks high.'],
      symptoms: ['Fill in the daily checklist: cough, sore throat, fever, cold sores, rash, slow-healing wounds.', 'You can attach a photo of a rash or wound for the doctor.'],
    },
    whenToAct: {
      self: 'One mild symptom: rest, fluids, hand hygiene, re-check tomorrow.',
      crew: 'Fever ≥ 37.6 °C or 2+ symptoms → CMO, consider separating sleep areas.',
      ground: 'Symptoms lasting > 3 days or spreading to other crew → flight surgeon consult, medication plan.',
    },
    actions: ['Fill in today’s symptom checklist', 'Drink at least 2.5 L of fluids today', 'Prioritise sleep tonight – it supports immunity'],
    sources: [SOURCES.i4, SOURCES.body],
  },
  {
    id: 'metabolism',
    name: 'Metabolism & nutrition',
    organ: 'Stomach & pancreas',
    icon: '🍽',
    func: 'Turns food into energy and keeps blood sugar stable.',
    spaceEffect:
      'Appetite drops in space, so many astronauts eat and drink too little. Inactivity and stress hormones can raise blood sugar. Inadequate nutrition is one of NASA’s listed spaceflight risks.',
    hazards: ['G', 'I', 'E'],
    indicators: ['glucose', 'bodyMass', 'hydration'],
    howTo: {
      glucose: ['Fasting, in the morning before breakfast.', 'Clean finger, use the second drop of blood on the test strip.'],
      bodyMass: ['Weekly, on the body-mass measurement device, same time of day, before eating.'],
      hydration: ['Log each drink pouch in the app (tap the + button).'],
    },
    whenToAct: {
      self: 'Low fluid intake: drink an extra pouch with each meal.',
      crew: 'Body mass < 97% of pre-flight or fasting glucose ≥ 110 mg/dL twice → CMO, adjust meal plan.',
      ground: 'Glucose ≥ 126 mg/dL or continued weight loss → nutrition plan from the flight surgeon.',
    },
    actions: ['Eat all planned meals today (no skipped snacks)', 'Drink one extra pouch of water with each meal', 'Swap a sweet snack for a protein snack'],
    sources: [SOURCES.body, SOURCES.hazards],
  },
  {
    id: 'muscles',
    name: 'Muscles & fitness',
    organ: 'Muscles',
    icon: '💪',
    func: 'Move the body and protect joints; strong muscles are needed for spacewalks and landing.',
    spaceEffect:
      'Without gravity, postural and leg muscles shrink quickly. Daily exercise is the main countermeasure – our ACTIVITY_DETECTOR model checks it from wristband data, and RECOVERY_TIME_PREDICTOR estimates how long you need to recover.',
    hazards: ['G'],
    indicators: ['exerciseMin', 'recoveryH', 'fatigue'],
    howTo: {
      exerciseMin: ['Wear the wristband during every session – the model detects aerobic vs anaerobic exercise automatically.'],
      recoveryH: ['Computed after each session from your heart rate, skin conductance and temperature.'],
      fatigue: ['Rate fatigue 0–100 after the evening routine.'],
    },
    whenToAct: {
      self: 'Missed a session: add it tomorrow, keep the total ≈ 2 h/day.',
      crew: 'Exercise < 90 min/day for several days or recovery time rising → CMO adjusts the training plan.',
      ground: 'Pain, injury or no recovery after 2 days → flight surgeon + physiotherapist consult.',
    },
    actions: ['Complete today’s resistance session (squats, deadlifts, heel raises)', 'Add a 30-min cycle ergometer session', 'Take a rest day before the next EVA'],
    sources: [SOURCES.models, SOURCES.body],
  },
  {
    id: 'bones',
    name: 'Bones',
    organ: 'Skeleton',
    icon: '🦴',
    func: 'Support the body and store calcium.',
    spaceEffect:
      'Without load, weight-bearing bones (hips, spine, legs) lose on average 1–1.5% of their density every month. Resistance exercise slows it down but does not fully stop it.',
    hazards: ['G'],
    indicators: ['boneDensity'],
    howTo: { boneDensity: ['Weekly ultrasound scan of the heel/hip following the on-screen guide.', 'Same leg, same position every time.'] },
    whenToAct: {
      self: 'Small drop: make sure you do all resistance sessions and take vitamin D + calcium.',
      crew: 'Below 98.5% of pre-flight → CMO increases resistance training.',
      ground: 'Below 97.5% or fast decline → flight surgeon; medication (bisphosphonates) may be considered.',
    },
    actions: ['Do 2 extra resistance (ARED) sessions this week', 'Take vitamin D and calcium with breakfast', 'Do the weekly bone scan'],
    sources: [SOURCES.bone],
  },
  {
    id: 'radiation',
    name: 'Radiation exposure',
    organ: 'Whole body (dosimeter)',
    icon: '☢',
    func: 'Your personal dosimeter tracks how much space radiation your body has absorbed.',
    spaceEffect:
      'Space radiation damages DNA and raises long-term risks of cancer, heart disease and cataracts. NASA limits a career dose to 600 mSv; a single solar particle event must stay below 250 mSv.',
    hazards: ['R', 'D'],
    indicators: ['radiationDose'],
    howTo: { radiationDose: ['Wear the personal dosimeter on your chest at all times; it uploads automatically.'] },
    whenToAct: {
      self: 'Solar storm warning: go to the shielded shelter immediately.',
      crew: 'Dose rising faster than planned → CMO reviews shielding and EVA schedule.',
      ground: 'Approaching 50% of the career limit → mission planning with flight surgeons.',
    },
    actions: ['Keep your dosimeter on', 'Know the way to the storm shelter', 'Avoid unplanned time in less-shielded modules'],
    sources: [SOURCES.radiation, SOURCES.hazards],
  },
]

export const getSystem = (id: SystemId) => SYSTEMS.find((s) => s.id === id)!

/** daily routine: which measurements are due on which mission days */
export const ROUTINE: { id: string; label: string; every: number; xp: number; system: SystemId }[] = [
  { id: 'bloodPressure', label: 'Blood pressure (morning, 2 readings)', every: 1, xp: 15, system: 'heart' },
  { id: 'mood', label: 'Mood check-in', every: 1, xp: 5, system: 'brain' },
  { id: 'symptoms', label: 'Symptom checklist', every: 1, xp: 5, system: 'immune' },
  { id: 'hydration', label: 'Log fluid intake', every: 1, xp: 5, system: 'metabolism' },
  { id: 'glucose', label: 'Fasting blood sugar', every: 3, xp: 15, system: 'metabolism' },
  { id: 'nearVision', label: 'Near-vision self-test', every: 7, xp: 20, system: 'eyes' },
  { id: 'bodyMass', label: 'Body mass', every: 7, xp: 10, system: 'metabolism' },
]
