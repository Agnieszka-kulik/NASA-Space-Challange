import { CATEGORY_LABELS, PARAMETERS, type ParamCategory } from '../data/parameters'

interface Props {
  selected: string[]
  onToggle: (id: string) => void
}

const CATEGORIES: ParamCategory[] = ['astronaut', 'environment']

export default function ParameterPicker({ selected, onToggle }: Props) {
  return (
    <section className="panel picker">
      <h2 className="panel__title">Choose parameters</h2>
      {CATEGORIES.map((cat) => (
        <fieldset key={cat} className="picker__group">
          <legend>{CATEGORY_LABELS[cat]}</legend>
          {PARAMETERS.filter((p) => p.category === cat).map((p) => (
            <label key={p.id} className="picker__item">
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)} />
              <span>{p.label}</span>
              <span className="picker__unit">{p.unit}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </section>
  )
}
