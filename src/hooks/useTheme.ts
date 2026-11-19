import { useCallback, useState } from 'react'

export type ThemeName = 'paper' | 'ink'

const storageKey = 'file-converter-theme'

function readTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'ink' ? 'ink' : 'paper'
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(readTheme)

  const apply = useCallback((next: ThemeName) => {
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next === 'ink' ? 'dark' : 'light'
    localStorage.setItem(storageKey, next)
    setTheme(next)
  }, [])

  const toggle = useCallback(() => {
    apply(theme === 'ink' ? 'paper' : 'ink')
  }, [apply, theme])

  return { theme, toggle }
}
