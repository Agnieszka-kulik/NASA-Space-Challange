import { useState } from 'react'
import type { SystemId } from '../../../shared/digitalTwin/knowledge'

export interface LogResult {
  values: Record<string, number>
  symptoms: string[]
  photo: string | null
  note: string
}

interface Props {
  focus: SystemId | null
  onClose: () => void
  onSave: (result: LogResult) => void
}

const MOODS = [
  { v: 1, e: '😣', l: 'Very bad' },
  { v: 2, e: '🙁', l: 'Bad' },
  { v: 3, e: '😐', l: 'OK' },
  { v: 4, e: '🙂', l: 'Good' },
  { v: 5, e: '😄', l: 'Great' },
]

const SYMPTOMS = ['Cough', 'Sore throat', 'Fever / chills', 'Headache', 'Blurry near vision', 'Cold sores', 'Rash / skin irritation', 'Slow-healing wound', 'Nausea']

interface Field {
  id: string
  label: string
  unit: string
  step: number
  placeholder: string
  systems: SystemId[]
}

const FIELDS: Field[] = [
  { id: 'bloodPressure', label: 'Blood pressure – systolic', unit: 'mmHg', step: 1, placeholder: '118', systems: ['heart'] },
  { id: 'diastolic', label: 'Blood pressure – diastolic', unit: 'mmHg', step: 1, placeholder: '78', systems: ['heart'] },
  { id: 'heartRate', label: 'Resting heart rate', unit: 'BPM', step: 1, placeholder: '64', systems: ['heart'] },
  { id: 'spo2', label: 'Blood oxygen (SpO₂)', unit: '%', step: 0.1, placeholder: '98', systems: ['lungs'] },
  { id: 'temperature', label: 'Body temperature', unit: '°C', step: 0.1, placeholder: '36.7', systems: ['immune'] },
  { id: 'glucose', label: 'Fasting blood sugar', unit: 'mg/dL', step: 1, placeholder: '92', systems: ['metabolism'] },
  { id: 'hydration', label: 'Fluid intake today', unit: 'L', step: 0.1, placeholder: '2.5', systems: ['metabolism'] },
  { id: 'bodyMass', label: 'Body mass', unit: '% of pre-flight', step: 0.1, placeholder: '99.5', systems: ['metabolism'] },
  { id: 'sleep', label: 'Sleep last night', unit: 'h', step: 0.1, placeholder: '7.5', systems: ['brain'] },
  { id: 'stress', label: 'Stress level', unit: '/100', step: 1, placeholder: '35', systems: ['brain'] },
  { id: 'fatigue', label: 'Fatigue', unit: '/100', step: 1, placeholder: '30', systems: ['muscles', 'brain'] },
  { id: 'nearVision', label: 'Near-vision test – lines read', unit: '/10', step: 1, placeholder: '10', systems: ['eyes'] },
  { id: 'boneDensity', label: 'Bone scan result', unit: '% of pre-flight', step: 0.1, placeholder: '99.4', systems: ['bones'] },
]

export default function LogMeasurement({ focus, onClose, onSave }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [mood, setMood] = useState<number | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showAll, setShowAll] = useState(!focus)

  const fields = showAll || !focus ? FIELDS : FIELDS.filter((f) => f.systems.includes(focus))
  const showMood = showAll || !focus || focus === 'brain'
  const showSymptoms = showAll || !focus || focus === 'immune' || focus === 'eyes'

  const save = () => {
    const numeric: Record<string, number> = {}
    for (const [k, v] of Object.entries(values)) if (v.trim() !== '' && k !== 'diastolic') numeric[k] = Number(v.replace(',', '.'))
    if (mood !== null) numeric.mood = mood
    if (showSymptoms) numeric.symptoms = symptoms.length
    onSave({ values: numeric, symptoms, photo, note })
  }

  const onPhoto = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Log a measurement">
      <div className="modal__box">
        <header className="modal__head">
          <h2>✎ Log a measurement</h2>
          <button className="modal__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <p className="muted">Fill in only what you measured. The twin compares each value with your personal normal right away.</p>

        <div className="form-grid">
          {fields.map((f) => (
            <label key={f.id} className="field">
              <span>{f.label}</span>
              <div className="field__input">
                <input
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  placeholder={f.placeholder}
                  value={values[f.id] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                />
                <em>{f.unit}</em>
              </div>
            </label>
          ))}
        </div>

        {showMood && (
          <div className="field">
            <span>How do you feel today?</span>
            <div className="moods">
              {MOODS.map((m) => (
                <button key={m.v} className={`mood ${mood === m.v ? 'mood--on' : ''}`} onClick={() => setMood(m.v)} title={m.l}>
                  <span>{m.e}</span>
                  <small>{m.l}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {showSymptoms && (
          <div className="field">
            <span>Symptoms today (tick all that apply)</span>
            <div className="symptoms">
              {SYMPTOMS.map((s) => (
                <label key={s} className={`symptom ${symptoms.includes(s) ? 'symptom--on' : ''}`}>
                  <input type="checkbox" checked={symptoms.includes(s)} onChange={() => setSymptoms((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))} />
                  {s}
                </label>
              ))}
            </div>
            <label className="photo">
              <input type="file" accept="image/*" capture="environment" onChange={(e) => onPhoto(e.target.files?.[0])} />
              📷 {photo ? 'Photo attached – tap to change' : 'Attach a photo (rash, wound, eye) for the doctor'}
            </label>
            {photo && <img className="photo__preview" src={photo} alt="Attached symptom" />}
          </div>
        )}

        <label className="field">
          <span>Note (optional)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the doctor should know…" />
        </label>

        <footer className="modal__foot">
          {focus && !showAll && (
            <button className="link-btn" onClick={() => setShowAll(true)}>
              Show all measurements
            </button>
          )}
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={save}>
            Save & update my twin
          </button>
        </footer>
      </div>
    </div>
  )
}
