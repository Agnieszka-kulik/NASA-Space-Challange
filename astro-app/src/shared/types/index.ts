// Wspólne typy używane przez oba panele – zmiany tutaj uzgadniajcie razem.

export interface Astronaut {
  id: string
  name: string
}

export interface Measurement {
  id: string
  astronautId: string
  type: string // np. 'BPM', 'saturacja', 'tętno', 'sen', 'stres'
  value: number
  timestamp: string // ISO date
}
