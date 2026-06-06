import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ThemeId = 'blueprint' | 'matrix' | 'neon' | 'halloween' | 'light' | 'terminal'

interface ThemeContextType {
  theme    : ThemeId
  setTheme : (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme    : 'blueprint',
  setTheme : () => {},
})

const THEMES: Record<ThemeId, {
  bg: string; bgCard: string; bgDarker: string
  accent: string; accentAlt: string
  text: string; textMuted: string; textDim: string
  border: string; gridColor: string; gridFine: string
}> = {
  blueprint: {
    bg: '#060d1f', bgCard: '#0a1628', bgDarker: '#040b18',
    accent: '#6366f1', accentAlt: '#3b82f6',
    text: '#e2e8f0', textMuted: '#94a3b8', textDim: '#64748b',
    border: 'rgba(59,130,246,0.14)', gridColor: 'rgba(59,130,246,0.045)', gridFine: 'rgba(59,130,246,0.018)',
  },
  matrix: {
    bg: '#000000', bgCard: '#030a03', bgDarker: '#000000',
    accent: '#00ff41', accentAlt: '#00cc33',
    text: '#00ff41', textMuted: '#00cc33', textDim: '#008f24',
    border: 'rgba(0,255,65,0.2)', gridColor: 'rgba(0,255,65,0.06)', gridFine: 'rgba(0,255,65,0.02)',
  },
  neon: {
    bg: '#0d0015', bgCard: '#150020', bgDarker: '#080010',
    accent: '#c084fc', accentAlt: '#22d3ee',
    text: '#f0e6ff', textMuted: '#c084fc', textDim: '#7c3aed',
    border: 'rgba(192,132,252,0.2)', gridColor: 'rgba(192,132,252,0.05)', gridFine: 'rgba(192,132,252,0.02)',
  },
  halloween: {
    bg: '#0a0500', bgCard: '#130800', bgDarker: '#060300',
    accent: '#f97316', accentAlt: '#ea580c',
    text: '#fed7aa', textMuted: '#fb923c', textDim: '#9a3412',
    border: 'rgba(249,115,22,0.2)', gridColor: 'rgba(249,115,22,0.05)', gridFine: 'rgba(249,115,22,0.02)',
  },
  terminal: {
    bg: '#000000', bgCard: '#0a0800', bgDarker: '#000000',
    accent: '#f59e0b', accentAlt: '#d97706',
    text: '#fef3c7', textMuted: '#f59e0b', textDim: '#92400e',
    border: 'rgba(245,158,11,0.2)', gridColor: 'rgba(245,158,11,0.05)', gridFine: 'rgba(245,158,11,0.02)',
  },
  light: {
    bg: '#f8fafc', bgCard: '#ffffff', bgDarker: '#f1f5f9',
    accent: '#6366f1', accentAlt: '#3b82f6',
    text: '#0f172a', textMuted: '#475569', textDim: '#94a3b8',
    border: 'rgba(99,102,241,0.15)', gridColor: 'rgba(99,102,241,0.06)', gridFine: 'rgba(99,102,241,0.025)',
  },
}

function applyTheme(id: ThemeId) {
  const t = THEMES[id]

  // Set CSS variables on root
  const root = document.documentElement
  root.style.setProperty('--bg',          t.bg)
  root.style.setProperty('--bg-card',     t.bgCard)
  root.style.setProperty('--bg-darker',   t.bgDarker)
  root.style.setProperty('--accent',      t.accent)
  root.style.setProperty('--accent-alt',  t.accentAlt)
  root.style.setProperty('--text',        t.text)
  root.style.setProperty('--text-muted',  t.textMuted)
  root.style.setProperty('--text-dim',    t.textDim)
  root.style.setProperty('--border',      t.border)
  root.style.setProperty('--grid',        t.gridColor)
  root.style.setProperty('--grid-fine',   t.gridFine)

  // Apply to body directly
  document.body.style.backgroundColor = t.bg
  document.body.style.color           = t.text

  // Inject !important overrides — these beat inline styles
  // Blueprint RGB values: #060d1f=rgb(6,13,31) #0a1628=rgb(10,22,40) #040b18=rgb(4,11,24)
  let el = document.getElementById('vestr-theme-overrides') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'vestr-theme-overrides'
    document.head.appendChild(el)
  }

  el.textContent = `
    /* Main page backgrounds */
    [style*="rgb(6, 13, 31)"],
    [style*="060d1f"] {
      background: ${t.bg} !important;
      background-color: ${t.bg} !important;
    }

    /* Card / panel backgrounds */
    [style*="rgb(10, 22, 40)"],
    [style*="0a1628"] {
      background: ${t.bgCard} !important;
      background-color: ${t.bgCard} !important;
    }

    /* Darker / nav backgrounds */
    [style*="rgb(4, 11, 24)"],
    [style*="040b18"] {
      background: ${t.bgDarker} !important;
      background-color: ${t.bgDarker} !important;
    }

    /* Nav with opacity */
    [style*="rgba(6, 13, 31"] {
      background: ${t.bg}f5 !important;
      background-color: ${t.bg} !important;
    }

    /* Input backgrounds */
    input, textarea {
      background-color: ${t.bgDarker} !important;
      color: ${t.text} !important;
    }

    /* Body always matches theme */
    body, html {
      background-color: ${t.bg} !important;
      color: ${t.text} !important;
    }
  `
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem('vestr_theme') as ThemeId) || 'blueprint'
  })

  // Apply on mount
  useEffect(() => { applyTheme(theme) }, [])

  const setTheme = (t: ThemeId) => {
    setThemeState(t)
    localStorage.setItem('vestr_theme', t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}