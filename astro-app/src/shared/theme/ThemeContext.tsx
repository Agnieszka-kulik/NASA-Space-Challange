import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'space' | 'cozy'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

const STORAGE_KEY = 'astro_theme_mode'

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'space',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'cozy' || saved === 'space') return saved
    } catch {
      // ignore storage errors
    }
    return 'space'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore storage errors
    }
  }, [theme])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'space' || e.newValue === 'cozy')) {
        setThemeState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = (mode: ThemeMode) => setThemeState(mode)
  const toggleTheme = () => setThemeState((prev) => (prev === 'space' ? 'cozy' : 'space'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isCozy = theme === 'cozy'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${isCozy ? 'theme-toggle-btn--cozy' : 'theme-toggle-btn--space'} ${className}`.trim()}
      title={isCozy ? 'Switch to Default Space Dark Theme' : 'Switch to Calming Cozy Light Theme'}
    >
      <span className="theme-toggle-btn__icon">{isCozy ? '🌌' : '🌿'}</span>
      <span className="theme-toggle-btn__label">
        {isCozy ? 'Space Mode' : 'Cozy Mode'}
      </span>
      <span className="theme-toggle-btn__swatches" aria-hidden="true">
        {isCozy ? (
          <>
            <i style={{ background: '#0d1b3a' }} />
            <i style={{ background: '#00f5d4' }} />
            <i style={{ background: '#38bdf8' }} />
          </>
        ) : (
          <>
            <i style={{ background: '#F5F0E7' }} />
            <i style={{ background: '#A5B39A' }} />
            <i style={{ background: '#B98970' }} />
          </>
        )}
      </span>
    </button>
  )
}
