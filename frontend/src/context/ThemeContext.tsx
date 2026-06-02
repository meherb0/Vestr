import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme     : Theme
  setTheme  : (theme: Theme) => void
  isDark    : boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateUser, isLoggedIn } = useAuth()
  const [theme, setThemeState] = useState<Theme>(
    (user?.theme as Theme) || 'dark'
  )

  // Sync theme with user preferences when user loads
  useEffect(() => {
    if (user?.theme) {
      setThemeState(user.theme as Theme)
    }
  }, [user?.theme])

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)

    // Persist to backend if logged in
    if (isLoggedIn && user) {
      try {
        const { authService } = await import('../services/api')
        const updated = await authService.updatePreferences({ theme: newTheme })
        updateUser(updated)
      } catch {
        // Silently fail — theme still applies locally
      }
    }
  }

  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}