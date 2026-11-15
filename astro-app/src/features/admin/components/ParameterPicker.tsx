import { PARAMETERS, type ParamCategory } from '../data/parameters'

interface Props {
  category: ParamCategory
  selected: string[]
  onToggle: (id: string) => void
}

/** Compact toggle chips placed right above the charts they control */
export default function ParameterPicker({ category, selected, onToggle }: Props) {
  return (
    <div className="picker-chips" role="group" aria-label="Choose parameters">
      {PARAMETERS.filter((p) => p.category === category).map((p) => {
        const on = selected.includes(p.id)
        return (
          <button
            key={p.id}
            className={`pchip ${on ? 'pchip--on' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(p.id)}
            title={p.info}
          >
            {on ? '✓ ' : '+ '}
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
