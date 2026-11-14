import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export interface ExaminationGuide {
  id: string
  category: string
  icon: string
  title: string
  duration: string
  equipment: string
  normRange: string
  purpose: string
  steps: string[]
}

export const EXAMINATION_GUIDES: ExaminationGuide[] = [
  {
    id: 'd-temp',
    category: 'Daily Measurements',
    icon: '🌡️',
    title: 'Body Temperature',
    duration: '2 minutes',
    equipment: 'ISS-IR Infrared Ear Thermometer / Temporal Sensor',
    normRange: '36.1 °C – 37.2 °C',
    purpose:
    'Early detection of inflammation, infection, and circadian rhythm shifts in microgravity.',
    steps: [
      'Take the measurement in the morning right after waking up, before meals or exercise.',
      'Place the IR thermometer tip gently in the ear canal or hold the sensor against your temple.',
      'Wait for the beep (approx. 3 seconds) and read the value on the display.',
      'Enter the result in the "Daily Measurements" section (e.g. 36.6) and check off the task.',
    ],
  },
  {
    id: 'd-bp',
    category: 'Daily Measurements',
    icon: '🩸',
    title: 'Blood Pressure',
    duration: '5 minutes',
    equipment: 'Orbital Upper-Arm Blood Pressure Monitor (Cardio-Holter)',
    normRange: '110/70 – 128/82 mmHg',
    purpose:
    'Monitoring fluid redistribution toward the upper body caused by weightlessness.',
    steps: [
      'Rest comfortably for at least 3 minutes before starting the measurement.',
      'Wrap the cuff around your left upper arm at heart level (2 cm above the elbow crease).',
      'Start the automatic pump and keep your arm still while the cuff inflates.',
      'Record your systolic and diastolic pressure (e.g. 120/80 mmHg).',
    ],
  },
  {
    id: 'w-urine',
    category: 'Weekly Measurements',
    icon: '🧪',
    title: 'Urine Sample Analysis (pH, Specific Gravity)',
    duration: '10 minutes',
    equipment: 'Urine-Strip Diagnostic Kit + WHC Optical Analyzer',
    normRange: 'pH 5.5 – 7.0 | Specific Gravity: 1.010 – 1.025 g/cm³',
    purpose:
    'Monitoring hydration, electrolyte balance, and kidney stone risk related to bone demineralization.',
    steps: [
      'Collect a morning urine sample into a single-use valved collection bag.',
      'Insert the test strip into the capillary chamber for 2 seconds.',
      'Place the strip into the medical module optical reader and wait 60 seconds.',
      'Enter the measured pH and hydration status into your checklist.',
    ],
  },
  {
    id: 'w-blood',
    category: 'Weekly Measurements',
    icon: '🔬',
    title: 'Capillary Blood Count (Hemoglobin)',
    duration: '12 minutes',
    equipment: 'rHEALTH Hematology Micro-Analyzer / Capillary Lancet',
    normRange: 'Hemoglobin: 13.5 – 17.5 g/dL',
    purpose:
    'Monitoring spaceflight anemia and blood oxygen-carrying capacity during long-duration missions.',
    steps: [
      'Disinfect the tip of your ring finger with an alcohol swab.',
      'Perform a painless micro-prick with a single-use lancet and draw a drop into the micro-cuvette.',
      'Insert the micro-cuvette into the onboard analyzer.',
      'After 90 seconds, read the hemoglobin level (g/dL) and log it in the panel.',
    ],
  },
  {
    id: 't-strength',
    category: 'Physical Training',
    icon: '🏋️',
    title: 'ARED Resistance & COLBERT Treadmill Workout',
    duration: '60 – 90 minutes',
    equipment: 'ARED Vacuum Resistance Device + COLBERT Harness Treadmill',
    normRange: 'Min. 45 min cardio + 3 resistance sets daily',
    purpose:
    'Preventing muscle atrophy and bone mineral density loss in microgravity.',
    steps: [
      'Fasten the waist belt and bungee harness before stepping onto the COLBERT treadmill.',
      'On the ARED device, set the vacuum cylinder load according to your daily plan.',
      'Perform squats, deadlifts, and presses while maintaining spinal alignment.',
      'Once finished, enter the duration or completed sets in the checklist.',
    ],
  },
  {
    id: 's-vision',
    category: 'Vision & Hearing Tests',
    icon: '👁️',
    title: 'Visual Acuity & Fundus Exam (SANS)',
    duration: '15 minutes',
    equipment: 'Digital Snellen Chart + Onboard Ophthalmoscope / OCT',
    normRange: 'Acuity: 20/20 | No optic disc edema',
    purpose:
    'Monitoring Spaceflight-Associated Neuro-ocular Syndrome (SANS) caused by intracranial pressure shifts.',
    steps: [
      'Position the diagnostic tablet exactly 2 meters from your eyes (use the distance tether).',
      'Complete the character reading test separately for your left and right eye.',
      'If any visual distortion occurs, perform a retinal scan using the OCT device.',
      'Log your visual acuity result (e.g. 20/20) in the task form.',
    ],
  },
  {
    id: 's-hearing',
    category: 'Vision & Hearing Tests',
    icon: '🎧',
    title: 'Hearing Test – Cabin Audiometry',
    duration: '10 minutes',
    equipment: 'ANR Noise-Canceling Headphones + Pure-Tone Audiometry App',
    normRange: 'Hearing threshold: ≤ 20 dB HL across 250 Hz – 8 kHz',
    purpose:
    'Protecting your hearing from continuous background noise produced by fans, pumps, and ECLSS systems.',
    steps: [
      'Move to the quietest module (crew quarters) and put on the calibrated headphones.',
      'Launch the test tone sequence and press the button whenever you hear a sound.',
      'After completing both ears, record your average hearing threshold in dB.',
    ],
  },
  {
    id: 'mg-reflex',
    category: 'Cognitive Minigames',
    icon: '🕹️',
    title: 'Reflex, Memory & Focus Minigames',
    duration: '3 – 5 minutes',
    equipment: 'Onboard Terminal / Astronaut Panel',
    normRange: 'Reaction time: < 300 ms | Memory: > 80/100 pts',
    purpose:
    'Assessing psychomotor speed, reaction time, and detecting hidden cognitive fatigue.',
    steps: [
      'Expand the "Cognitive Minigames" section on your checklist.',
      'For the reflex test, click "⚡ Reflex Test", wait for the green signal, and click as fast as you can.',
      'For memory training, use the "🎲 Draw Game" button to pick a memory exercise variant.',
    ],
  },
]

export default function GuideSubpage() {
  const [searchParams] = useSearchParams()
  const initialTopic = searchParams.get('topic') || EXAMINATION_GUIDES[0].id
  const [selectedId, setSelectedId] = useState<string>(initialTopic)

  const currentGuide =
    EXAMINATION_GUIDES.find((g) => g.id === selectedId) || EXAMINATION_GUIDES[0]

  return (
    <div className="user-subpage">
      <div className="user-subpage__top">
        <Link to="/user" className="user-back-btn">
          ← Back to Astronaut Panel
        </Link>
        <span className="live-badge">
          📖 ONBOARD MEDICAL & TASK INSTRUCTIONS
        </span>
      </div>

      <h1 className="user-subpage__title">Knowledge Base: How to Perform Measurements & Tasks</h1>
      <p className="user-subpage__subtitle">
        Select an examination from the list on the left to see its purpose, required equipment, healthy ranges, and step-by-step instructions.
      </p>

      <div className="guide-layout">
        <aside className="hud-card guide-sidebar">
          <h3 className="hud-section-title">SELECT AN EXAMINATION</h3>
          <div className="guide-nav-list">
            {EXAMINATION_GUIDES.map((g) => {
              const isActive = g.id === currentGuide.id
              return (
                <button
                  key={g.id}
                  type="button"
                  className={`guide-nav-btn ${isActive ? 'guide-nav-btn--active' : ''}`}
                  onClick={() => setSelectedId(g.id)}
                >
                  <span className="guide-nav-btn__icon">{g.icon}</span>
                  <div className="guide-nav-btn__text">
                    <div className="guide-nav-btn__title">{g.title}</div>
                    <div className="guide-nav-btn__cat">{g.category}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="hud-card guide-detail">
          <div className="guide-detail__header">
            <span className="guide-detail__icon">{currentGuide.icon}</span>
            <div>
              <span className="guide-detail__cat">{currentGuide.category}</span>
              <h2 className="guide-detail__title">{currentGuide.title}</h2>
            </div>
          </div>

          <div className="guide-meta-grid">
            <div className="guide-meta-box">
              <span className="guide-meta-box__label">⏱️ Duration</span>
              <strong>{currentGuide.duration}</strong>
            </div>
            <div className="guide-meta-box">
              <span className="guide-meta-box__label">🧰 Required Equipment</span>
              <strong>{currentGuide.equipment}</strong>
            </div>
            <div className="guide-meta-box">
              <span className="guide-meta-box__label">✅ Healthy Reference Range</span>
              <strong style={{ color: '#00f5d4' }}>{currentGuide.normRange}</strong>
            </div>
          </div>

          <div className="guide-purpose-box">
            <h4>Why this matters in space:</h4>
            <p>{currentGuide.purpose}</p>
          </div>

          <div className="guide-steps-box">
            <h4>Step-by-step instructions:</h4>
            <ol className="guide-steps-list">
              {currentGuide.steps.map((step, idx) => (
                <li key={idx} className="guide-step-item">
                  <span className="guide-step-num">{idx + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  )
}
