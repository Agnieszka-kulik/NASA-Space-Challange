import { Link } from 'react-router-dom'

// 🛠️ Panel Admina – tutaj pracuje osoba od admina.
// Pomysły z notatek: nowa misja, lista astronautów, wybór parametrów, wykresy, porównania.
// Własne komponenty wrzucaj do ./components, a podstrony dodawaj jako <Routes> w tym pliku.
export default function AdminPanel() {
  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/">← Wróć</Link>
      <h1>Panel Admina</h1>
    </div>
  )
}
