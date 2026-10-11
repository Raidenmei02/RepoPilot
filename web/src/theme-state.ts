import { createContext, useContext } from 'react'

export type ThemeName = 'day' | 'night'

const STORAGE_KEY = 'repopilot-theme'

export function readTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'day' || stored === 'night') return stored
  } catch {
    /* 隐私模式无法读取本地存储时，改用系统配色。 */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* 忽略无法写入的本地存储。 */
  }
}

export interface ThemeApi {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

export const ThemeContext = createContext<ThemeApi | null>(null)

export function useTheme(): ThemeApi {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}
