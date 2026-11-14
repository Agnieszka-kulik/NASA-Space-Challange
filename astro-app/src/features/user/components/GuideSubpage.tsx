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
    category: 'Codzienne pomiary',
    icon: '🌡️',
    title: 'Pomiar temperatury ciała',
    duration: '2 minuty',
    equipment: 'Termometr douszny podczerwony ISS-IR / czujnik skroniowy',
    normRange: '36.1 °C – 37.2 °C',
    purpose:
      'Wczesne wykrywanie stanów zapalnych, infekcji oraz zaburzeń rytmu dobowego w warunkach mikrograwitacji.',
    steps: [
      'Wykonaj pomiar rano bezpośrednio po przebudzeniu, przed posiłkiem i treningiem.',
      'Umieść końcówkę termometru IR w kanale słuchowym lub przyłóż czujnik do skroni.',
      'Poczekaj na sygnał dźwiękowy (ok. 3 sekundy) i odczytaj wynik z wyświetlacza.',
      'Wpisz wartość w sekcji "Codzienne pomiary" (np. 36.6) i zatwierdź zadanie.',
    ],
  },
  {
    id: 'd-bp',
    category: 'Codzienne pomiary',
    icon: '🩸',
    title: 'Pomiar ciśnienia tętniczego',
    duration: '5 minut',
    equipment: 'Ciśnieniomierz naramienny z mankietem orbitalnym (Cardio-Holter)',
    normRange: '110/70 – 128/82 mmHg',
    purpose:
      'Monitorowanie redystrybucji płynów ustrojowych ku górnej części ciała w stanie nieważkości.',
    steps: [
      'Odpocznij w pozycji swobodnej przez minimum 3 minuty przed pomiarem.',
      'Załóż mankiet na lewe ramię na wysokości serca (2 cm powyżej zgięcia łokciowego).',
      'Uruchom pompę automatyczną i nie poruszaj ręką podczas napełniania mankietu.',
      'Zapisz ciśnienie skurczowe i rozkurczowe w formacie np. 120/80 mmHg.',
    ],
  },
  {
    id: 'w-urine',
    category: 'Cotygodniowe pomiary',
    icon: '🧪',
    title: 'Analiza próbki moczu (pH, ciężar właściwy)',
    duration: '10 minut',
    equipment: 'Zestaw pasków diagnostycznych Urine-Strip + analizator optyczny WHC',
    normRange: 'pH 5.5 – 7.0 | Ciężar właściwy: 1.010 – 1.025 g/cm³',
    purpose:
      'Kontrola gospodarki wodno-elektrolitowej oraz ryzyka powstawania kamieni nerkowych wskutek odwapnienia kości.',
    steps: [
      'Pobierz próbkę porannego moczu do jednorazowego woreczka próżniowego z zaworem.',
      'Wprowadź pasek testowy do komory kapilarnej na 2 sekundy.',
      'Umieść pasek w czytniku optycznym modułu medycznego i odczekaj 60 sekund.',
      'Przepisz odczytane pH oraz status nawodnienia do listy zadań.',
    ],
  },
  {
    id: 'w-blood',
    category: 'Cotygodniowe pomiary',
    icon: '🔬',
    title: 'Morfologia kapilarna (Hemoglobina)',
    duration: '12 minut',
    equipment: 'Mikroanalizator hematologiczny rHEALTH / nakłuwacz kapilarny',
    normRange: 'Hemoglobina: 13.5 – 17.5 g/dL',
    purpose:
      'Kontrola tzw. anemii kosmicznej oraz zdolności krwi do transportu tlenu podczas długotrwałego lotu.',
    steps: [
      'Zdezynfekuj opuszek palca serdecznego gazikiem nasączonym alkoholem.',
      'Wykonaj bezbolesne mikronakłucie jednorazowym lancetem i pobierz kroplę krwi do mikrokuwety.',
      'Wsuń mikrokuwetę do analizatora pokładowego.',
      'Po 90 sekundach odczytaj poziom hemoglobiny (g/dL) i wpisz wynik w panelu.',
    ],
  },
  {
    id: 't-strength',
    category: 'Trening fizyczny',
    icon: '🏋️',
    title: 'Trening oporowy ARED & Bieżnia COLBERT',
    duration: '60 – 90 minut',
    equipment: 'Urządzenie próżniowe ARED + Bieżnia z uprzężą elastyczną COLBERT',
    normRange: 'Min. 45 min cardio + 3 serie ćwiczeń oporowych dziennie',
    purpose:
      'Zapobieganie utracie masy mięśniowej (atrofii) oraz spadkowi gęstości mineralnej kości w mikrograwitacji.',
    steps: [
      'Przypnij pas biodrowy i szelki dociskające przed wejściem na bieżnię COLBERT.',
      'Na urządzeniu ARED ustaw obciążenie cylindrów próżniowych zgodnie z planem dnia.',
      'Wykonaj serię przysiadów, martwego ciągu oraz wyciskania, pilnując stabilizacji kręgosłupa.',
      'Po zakończeniu wpisz czas trwania lub liczbę wykonanych serii w liście TODO.',
    ],
  },
  {
    id: 's-vision',
    category: 'Badania wzroku i słuchu',
    icon: '👁️',
    title: 'Badanie ostrości wzroku i dna oka (SANS)',
    duration: '15 minut',
    equipment: 'Tablica cyfrowa Snellena + Oftalmoskop / OCT pokładowe',
    normRange: 'Ostrość: 20/20 | Brak obrzęku tarczy nerwu wzrokowego',
    purpose:
      'Monitorowanie zespołu nerwowo-ocznego związanego z lotem kosmicznym (SANS) wywołanego ciśnieniem wewnątrzczaszkowym.',
    steps: [
      'Ustaw tablet diagnostyczny w odległości dokładnie 2 metrów od oczu (użyj taśmy dystansowej).',
      'Przeprowadź test czytania znaków osobno dla lewego i prawego oka.',
      'W razie zniekształceń obrazu wykonaj skan siatkówki aparatem OCT.',
      'Zapisz wynik ostrości wzroku (np. 20/20) w formularzu zadania.',
    ],
  },
  {
    id: 's-hearing',
    category: 'Badania wzroku i słuchu',
    icon: '🎧',
    title: 'Test słuchu – audiometria kabinowa',
    duration: '10 minut',
    equipment: 'Słuchawki tłumiące ANR + Aplikacja Audiometrii Tonalnej',
    normRange: 'Próg słyszenia: ≤ 20 dB HL w paśmie 250 Hz – 8 kHz',
    purpose:
      'Ochrona słuchu przed stałym szumem wentylatorów, pomp i systemów podtrzymania życia (ECLSS).',
    steps: [
      'Udaj się do najcichszego modułu (kajuta sypialna) i załóż słuchawki kalibrowane.',
      'Uruchom sekwencję tonów testowych i naciskaj przycisk za każdym razem, gdy usłyszysz dźwięk.',
      'Po zakończeniu dla obu uszu odczytaj średni próg słyszenia w dB.',
    ],
  },
  {
    id: 'mg-reflex',
    category: 'Minigierki kognitywne',
    icon: '🕹️',
    title: 'Minigierki na refleks, pamięć i koncentrację',
    duration: '3 – 5 minut',
    equipment: 'Terminal pokładowy / Panel Użytkownika',
    normRange: 'Czas reakcji: < 300 ms | Pamięć: > 80/100 pkt',
    purpose:
      'Ocena sprawności psychomotorycznej, szybkości reakcji oraz wykrywanie ukrytego zmęczenia poznawczego załogi.',
    steps: [
      'Rozwiń sekcję "Minigierki kognitywne" na liście TODO.',
      'W teście refleksu kliknij "⚡ Test refleksu", poczekaj na zielony sygnał i kliknij najszybciej jak potrafisz.',
      'W treningu pamięci użyj przycisku "🎲 Losuj gierkę", aby wylosować wariant ćwiczenia pamięciowego.',
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
          ← Wróć do Panelu Astronauty
        </Link>
        <span className="live-badge">
          📖 INSTRUKCJE MEDYCZNE I PROCEDURY POKŁADOWE NASA
        </span>
      </div>

      <h1 className="user-subpage__title">Baza Wiedzy: Jak Wykonywać Badania i Pomiary</h1>
      <p className="user-subpage__subtitle">
        Wybierz badanie z listy po lewej stronie, aby zobaczyć cel procedury, wymagany sprzęt, normy medyczne oraz instrukcję krok po kroku
      </p>

      <div className="guide-layout">
        {/* Lista wyboru badań */}
        <aside className="hud-card guide-sidebar">
          <h3 className="hud-section-title">WYBIERZ BADANIE Z LISTY</h3>
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

        {/* Szczegółowa instrukcja wybranego badania */}
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
              <span className="guide-meta-box__label">⏱️ Czas trwania</span>
              <strong>{currentGuide.duration}</strong>
            </div>
            <div className="guide-meta-box">
              <span className="guide-meta-box__label">🧰 Wymagany sprzęt</span>
              <strong>{currentGuide.equipment}</strong>
            </div>
            <div className="guide-meta-box">
              <span className="guide-meta-box__label">✅ Norma referencyjna</span>
              <strong style={{ color: '#00f5d4' }}>{currentGuide.normRange}</strong>
            </div>
          </div>

          <div className="guide-purpose-box">
            <h4>Cel badania w warunkach kosmicznych:</h4>
            <p>{currentGuide.purpose}</p>
          </div>

          <div className="guide-steps-box">
            <h4>Instrukcja wykonania krok po kroku:</h4>
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
