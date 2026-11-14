import { Link } from 'react-router-dom'

// 👨‍🚀 Panel Usera (astronauty) – tutaj pracuje osoba od usera.
// Pomysły z notatek: TODO pomiarów, kaczka, sklep, statystyki, ranking kaczek, mood.
// Własne komponenty wrzucaj do ./components, a podstrony dodawaj jako <Routes> w tym pliku.
export default function UserPanel() {
  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/">← Wróć</Link>
      <h1>Panel Astronauty</h1>
    </div>
  )
}
