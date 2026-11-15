// Ready-made recommendations the medical officer can send for a flagged parameter.
// Keep them short, actionable and understandable for a non-medic astronaut.

export const RECOMMENDATIONS: Record<string, string[]> = {
  bloodPressure: [
    'Re-measure blood pressure after 5 min seated rest; log both readings.',
    'Reduce sodium in the next meals and increase fluid intake to 2.5 L/day.',
    'Replace high-intensity exercise with moderate cardio until BP is back in range.',
  ],
  heartRate: [
    'Rest for 10 min, then re-measure resting heart rate and SpO₂.',
    'Avoid caffeine for the rest of the day; prioritise sleep tonight.',
  ],
  glucose: [
    'Re-test blood sugar 2 h after the next meal.',
    'Swap high-sugar snacks for protein; add a 20 min cycle ergometer session.',
  ],
  temperature: [
    'Re-measure temperature in 1 h; report any chills, cough or sore throat.',
    'Increase fluids and rest; isolate sleeping bag area if symptoms appear.',
  ],
  sleep: [
    'Sleep protocol: no screens 1 h before rest, blue-light dimming on, eye mask & earplugs.',
    'Shift tomorrow’s first task by 1 h to protect an 8 h sleep window.',
    'Use the scheduled light therapy session (30 min) after waking.',
  ],
  mood: [
    'Schedule a private family/psychologist call at the next comms window.',
    'Take part in a crew leisure activity tonight (movie, game, shared meal).',
    'Complete the 10 min guided breathing exercise in the app.',
  ],
  stress: [
    'Complete the 10 min guided breathing / relaxation exercise.',
    'Review and reduce today’s workload with the commander.',
  ],
  fatigue: [
    'Insert a 20 min nap before the next EVA or critical task.',
    'Postpone non-critical tasks; re-check fatigue score in the evening.',
  ],
  reflex: ['Re-run the reaction test after rest; avoid critical operations until it improves.'],
  memory: ['Re-run the memory test tomorrow morning after sleep.'],
  spo2: ['Re-measure SpO₂; check cabin O₂/CO₂ levels and report symptoms.'],
  boneDensity: [
    'Add 2 extra ARED resistance sessions this week (squats, deadlifts, heel raises).',
    'Check calcium and vitamin D supplement intake every day.',
  ],
  noise: ['Wear hearing protection in the module; check fans for vibration.'],
  radiation: [
    'Move crew to the shielded shelter (water-wall area) until the event ends.',
    'Postpone all EVAs; wear personal dosimeters at all times.',
  ],
  co2: [
    'Switch CO₂ scrubber to backup cycle; reduce exercise in the module.',
    'Report headaches or dizziness; increase ventilation fan speed.',
  ],
  cabinTemp: ['Check thermal control loop; adjust module temperature setpoint.'],
  particulates: [
    'Vacuum module surfaces and air-vent screens; replace or clean HEPA filters.',
    'Crew with nasal congestion or itchy eyes: use saline rinse / antihistamine from the medical kit and report symptoms.',
  ],
  humidity: ['Check condensing heat exchanger; wipe condensation to prevent mould.'],
}

export const examText = (label: string) => `Exam ordered: re-measure ${label.toLowerCase()} now and log the result in the app.`