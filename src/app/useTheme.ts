import { useEffect, useState } from 'react'
export type Theme = 'light' | 'dark' | 'system'
export const THEME_KEY = 'still.theme'
function initialTheme(): { theme: Theme; error: string | null } {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    return { theme: stored === 'light' || stored === 'dark' ? stored : 'system', error: null }
  } catch {
    return { theme: 'system', error: 'Theme preference could not be read. Using the system theme.' }
  }
}
export function useTheme() {
  const [{ theme, error }, setPreference] = useState(initialTheme)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  const setTheme = (next: Theme) => {
    try {
      window.localStorage.setItem(THEME_KEY, next)
      setPreference({ theme: next, error: null })
    } catch {
      setPreference({
        theme: next,
        error:
          'Theme changed for this session, but could not be saved. Allow browser storage and select the theme again to retry.',
      })
    }
  }
  return { theme, setTheme, themeError: error }
}
