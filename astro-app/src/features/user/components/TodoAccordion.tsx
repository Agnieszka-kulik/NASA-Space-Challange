import { useState } from 'react'

export interface TodoTask {
  id: string
  label: string
  done: boolean
  points: number
  unit?: string
  value?: string
  placeholder?: string
  isGame?: 'reflex' | 'memory' | 'focus'
}

export interface TodoSection {
  id: string
  title: string
  subtitle: string
  icon: string
  tasks: TodoTask[]
}

interface TodoAccordionProps {
  sections: TodoSection[]
  onToggleTask: (sectionId: string, taskId: string, newValue?: string) => void
  onUpdateValue: (sectionId: string, taskId: string, value: string) => void
  onAddCustomTask: (label: string, value: string) => void
}

export default function TodoAccordion({
  sections,
  onToggleTask,
  onUpdateValue,
  onAddCustomTask,
}: TodoAccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(['daily', 'minigames'])
  const [customLabel, setCustomLabel] = useState('')
  const [customVal, setCustomVal] = useState('')
  const [drawnGameMsg, setDrawnGameMsg] = useState<Record<string, string>>({})

  // Quick interactive reflex mini-game state
  const [reflexState, setReflexState] = useState<'idle' | 'waiting' | 'ready' | 'done'>('idle')
  const [reflexStart, setReflexStart] = useState<number>(0)
  const [reflexMs, setReflexMs] = useState<number | null>(null)

  const toggleSection = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const startReflexGame = (sectionId: string, taskId: string) => {
    setReflexState('waiting')
    setReflexMs(null)
    const delay = 1000 + Math.floor(Math.random() * 1800)
    window.setTimeout(() => {
      setReflexState('ready')
      setReflexStart(performance.now())
    }, delay)
    ;(window as unknown as { __reflexTarget?: { sectionId: string; taskId: string } }).__reflexTarget = {
      sectionId,
      taskId,
    }
  }

  const finishReflexGame = () => {
    if (reflexState !== 'ready') return
    const elapsed = Math.round(performance.now() - reflexStart)
    setReflexMs(elapsed)
    setReflexState('done')
    const target = (window as unknown as { __reflexTarget?: { sectionId: string; taskId: string } })
      .__reflexTarget
    if (target) {
      onUpdateValue(target.sectionId, target.taskId, `${elapsed} ms`)
      const sec = sections.find((s) => s.id === target.sectionId)
      const t = sec?.tasks.find((task) => task.id === target.taskId)
      if (t && !t.done) {
        onToggleTask(target.sectionId, target.taskId, `${elapsed} ms`)
      }
    }
  }

  const handleDrawMemoryGame = (taskId: string) => {
    setDrawnGameMsg((prev) => ({
      ...prev,
      [taskId]: 'Tryb losowania gotowy (docelowa pula gierek)',
    }))
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customLabel.trim()) return
    onAddCustomTask(customLabel.trim(), customVal.trim())
    setCustomLabel('')
    setCustomVal('')
  }

  return (
    <div className="todo-card">
      <div className="todo-card__header">
        <div>
          <h2 className="todo-card__title">Lista Zadań i Pomiarów</h2>
          <p className="todo-card__sub">Rozwiń sekcję, aby wprowadzić pomiary lub wykonać test</p>
        </div>
      </div>

      <div className="todo-accordion">
        {sections.map((section) => {
          const isOpen = openIds.includes(section.id)
          const completedCount = section.tasks.filter((t) => t.done).length
          const totalCount = section.tasks.length

          return (
            <div
              key={section.id}
              className={`todo-section ${isOpen ? 'todo-section--open' : ''} ${
                completedCount === totalCount && totalCount > 0 ? 'todo-section--complete' : ''
              }`}
            >
              <button
                type="button"
                className="todo-section__trigger"
                onClick={() => toggleSection(section.id)}
              >
                <div className="todo-section__left">
                  <span className="todo-section__icon">{section.icon}</span>
                  <div>
                    <div className="todo-section__name">{section.title}</div>
                    <div className="todo-section__desc">{section.subtitle}</div>
                  </div>
                </div>
                <div className="todo-section__right">
                  <span className="todo-section__badge">
                    {completedCount}/{totalCount}
                  </span>
                  <span className="todo-section__chevron">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="todo-section__body">
                  <ul className="todo-list">
                    {section.tasks.map((task) => (
                      <li key={task.id} className={`todo-item ${task.done ? 'todo-item--done' : ''}`}>
                        <label className="todo-item__label">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => onToggleTask(section.id, task.id)}
                            className="todo-item__checkbox"
                          />
                          <span className="todo-item__circle" />
                          <span className="todo-item__text">{task.label}</span>
                        </label>

                        <div className="todo-item__controls">
                          {task.isGame === 'reflex' && (
                            <div className="todo-minigame">
                              {reflexState === 'idle' || reflexState === 'done' ? (
                                <button
                                  type="button"
                                  className="todo-game-btn"
                                  onClick={() => startReflexGame(section.id, task.id)}
                                >
                                  {reflexMs ? `Wynik: ${reflexMs}ms (Powtórz)` : '⚡ Test refleksu'}
                                </button>
                              ) : reflexState === 'waiting' ? (
                                <button type="button" className="todo-game-btn todo-game-btn--wait">
                                  Czekaj na sygnał...
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="todo-game-btn todo-game-btn--go"
                                  onClick={finishReflexGame}
                                >
                                  KLIKNIJ TERAZ!
                                </button>
                              )}
                            </div>
                          )}

                          {task.isGame === 'memory' && (
                            <div className="todo-minigame">
                              <button
                                type="button"
                                className="todo-game-btn todo-game-btn--draw"
                                onClick={() => handleDrawMemoryGame(task.id)}
                              >
                                🎲 Losuj gierkę
                              </button>
                              {drawnGameMsg[task.id] && (
                                <span className="todo-drawn-hint">{drawnGameMsg[task.id]}</span>
                              )}
                            </div>
                          )}

                          {task.placeholder && task.isGame !== 'reflex' && (
                            <div className="todo-input-group">
                              <input
                                type="text"
                                className="todo-input"
                                placeholder={task.placeholder}
                                value={task.value || ''}
                                onChange={(e) => onUpdateValue(section.id, task.id, e.target.value)}
                              />
                              {task.unit && <span className="todo-input__unit">{task.unit}</span>}
                            </div>
                          )}

                          <span className="todo-item__pts">+{task.points} pkt</span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {section.id === 'extra' && (
                    <form className="todo-custom-form" onSubmit={handleAddCustom}>
                      <input
                        type="text"
                        className="todo-input todo-input--wide"
                        placeholder="Dodaj własny pomiar (np. Glukoza, Obwód, Notatka)..."
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                      />
                      <input
                        type="text"
                        className="todo-input"
                        placeholder="Wartość (opcjonalnie)"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                      />
                      <button type="submit" className="todo-add-btn">
                        + Dodaj
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
