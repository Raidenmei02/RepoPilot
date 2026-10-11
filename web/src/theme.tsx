import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, readTheme, ThemeContext, type ThemeName } from './theme-state'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => readTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const api = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>
}
