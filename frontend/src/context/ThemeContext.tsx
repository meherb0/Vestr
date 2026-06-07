import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeId = 'blueprint' | 'matrix' | 'neon' | 'halloween' | 'light' | 'terminal'

interface ThemeContextType {
  theme    : ThemeId
  setTheme : (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'blueprint', setTheme: () => {} })

interface ThemeDef {
  bg: string; bgCard: string; bgDarker: string; bgNav: string
  accent: string; accentAlt: string; accentGlow: string
  text: string; textBright: string; textMuted: string; textDim: string; textVeryDim: string
  border: string; borderSubtle: string
  gridColor: string; gridFine: string
  scanLine: string; scrollThumb: string
  name: string
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  blueprint: {
    name: 'Blueprint',
    bg: '#060d1f', bgCard: '#0a1628', bgDarker: '#040b18', bgNav: 'rgba(6,13,31,0.97)',
    accent: '#6366f1', accentAlt: '#3b82f6', accentGlow: 'rgba(99,102,241,0.4)',
    text: '#e2e8f0', textBright: '#f8fafc', textMuted: '#94a3b8', textDim: '#64748b', textVeryDim: '#475569',
    border: 'rgba(59,130,246,0.16)', borderSubtle: 'rgba(59,130,246,0.08)',
    gridColor: 'rgba(59,130,246,0.045)', gridFine: 'rgba(59,130,246,0.018)',
    scanLine: 'rgba(59,130,246,0.25)', scrollThumb: '#1e3050',
  },
  matrix: {
    name: 'Matrix',
    bg: '#000000', bgCard: '#050f05', bgDarker: '#000000', bgNav: 'rgba(0,5,0,0.97)',
    accent: '#00ff41', accentAlt: '#00cc33', accentGlow: 'rgba(0,255,65,0.5)',
    text: '#ccffcc', textBright: '#ffffff', textMuted: '#00cc33', textDim: '#008f24', textVeryDim: '#005a18',
    border: 'rgba(0,255,65,0.2)', borderSubtle: 'rgba(0,255,65,0.08)',
    gridColor: 'rgba(0,255,65,0.07)', gridFine: 'rgba(0,255,65,0.03)',
    scanLine: 'rgba(0,255,65,0.5)', scrollThumb: '#003b00',
  },
  neon: {
    name: 'Neon',
    bg: '#0d0015', bgCard: '#150025', bgDarker: '#080010', bgNav: 'rgba(13,0,21,0.97)',
    accent: '#c084fc', accentAlt: '#22d3ee', accentGlow: 'rgba(192,132,252,0.5)',
    text: '#f0e6ff', textBright: '#ffffff', textMuted: '#c084fc', textDim: '#9333ea', textVeryDim: '#7c3aed',
    border: 'rgba(192,132,252,0.2)', borderSubtle: 'rgba(192,132,252,0.08)',
    gridColor: 'rgba(192,132,252,0.05)', gridFine: 'rgba(34,211,238,0.03)',
    scanLine: 'rgba(192,132,252,0.5)', scrollThumb: '#4c1d95',
  },
  halloween: {
    name: 'Halloween',
    bg: '#0a0500', bgCard: '#150a00', bgDarker: '#050200', bgNav: 'rgba(10,5,0,0.97)',
    accent: '#f97316', accentAlt: '#ea580c', accentGlow: 'rgba(249,115,22,0.5)',
    text: '#fed7aa', textBright: '#fff7ed', textMuted: '#fb923c', textDim: '#c2410c', textVeryDim: '#9a3412',
    border: 'rgba(249,115,22,0.2)', borderSubtle: 'rgba(249,115,22,0.08)',
    gridColor: 'rgba(249,115,22,0.06)', gridFine: 'rgba(249,115,22,0.025)',
    scanLine: 'rgba(249,115,22,0.5)', scrollThumb: '#7c2d12',
  },
  terminal: {
    name: 'Terminal',
    bg: '#000000', bgCard: '#0d0a00', bgDarker: '#000000', bgNav: 'rgba(0,0,0,0.97)',
    accent: '#f59e0b', accentAlt: '#d97706', accentGlow: 'rgba(245,158,11,0.5)',
    text: '#fef3c7', textBright: '#fffbeb', textMuted: '#fbbf24', textDim: '#d97706', textVeryDim: '#92400e',
    border: 'rgba(245,158,11,0.2)', borderSubtle: 'rgba(245,158,11,0.08)',
    gridColor: 'rgba(245,158,11,0.06)', gridFine: 'rgba(245,158,11,0.025)',
    scanLine: 'rgba(245,158,11,0.5)', scrollThumb: '#78350f',
  },
  light: {
    name: 'Light',
    bg: '#f8fafc', bgCard: '#ffffff', bgDarker: '#f1f5f9', bgNav: 'rgba(248,250,252,0.97)',
    accent: '#6366f1', accentAlt: '#4f46e5', accentGlow: 'rgba(99,102,241,0.25)',
    text: '#0f172a', textBright: '#020617', textMuted: '#334155', textDim: '#475569', textVeryDim: '#64748b',
    border: 'rgba(99,102,241,0.15)', borderSubtle: 'rgba(99,102,241,0.07)',
    gridColor: 'rgba(99,102,241,0.05)', gridFine: 'rgba(99,102,241,0.02)',
    scanLine: 'rgba(99,102,241,0.08)', scrollThumb: '#cbd5e1',
  },
}

function buildCSS(id: ThemeId): string {
  const t = THEMES[id]
  const isLight = id === 'light'

  return `
/* ===== VESTR THEME: ${id.toUpperCase()} ===== */

/* ── Global animations ── */
@keyframes vestrCardGlow {
  0%,100% { border-color: ${t.border}; box-shadow: none; }
  50%      { border-color: ${t.accent}60; box-shadow: 0 0 12px ${t.accent}20; }
}
@keyframes vestrBlink {
  0%,100% { opacity: 1; }
  50%      { opacity: 0; }
}
@keyframes vestrFlicker {
  0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; }
  20%,24%,55% { opacity: 0.6; }
}
@keyframes vestrNeonPulse {
  0%,100% { text-shadow: 0 0 6px ${t.accentGlow}, 0 0 12px ${t.accentGlow}, 0 0 24px ${t.accentGlow}; }
  50%      { text-shadow: 0 0 10px ${t.accentGlow}, 0 0 20px ${t.accentGlow}, 0 0 40px ${t.accentGlow}; }
}
@keyframes vestrGradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ── Base ── */
html, body {
  background-color: ${t.bg} !important;
  color: ${t.text} !important;
}

/* ── SVG logo fix — stroke colors adapt to theme ── */
[stroke="#6366f1"] { stroke: ${t.accent} !important; }
[stroke="#3b82f6"] { stroke: ${t.accentAlt} !important; }
[fill="#6366f1"]   { fill: ${t.accent} !important; }

/* ── Backgrounds ── */
[style*="#060d1f"],[style*="6, 13, 31)"] {
  background-color: ${t.bg} !important;
  background: ${t.bg} !important;
}
[style*="#0a1628"],[style*="10, 22, 40)"] {
  background-color: ${t.bgCard} !important;
  background: ${t.bgCard} !important;
}
[style*="#040b18"],[style*="4, 11, 24)"] {
  background-color: ${t.bgDarker} !important;
  background: ${t.bgDarker} !important;
}

/* ── Nav ── */
nav {
  background: ${t.bgNav} !important;
  border-bottom: 1px solid ${t.border} !important;
  ${!isLight
    ? `box-shadow: 0 1px 20px ${t.accentGlow.replace('0.5','0.1')} !important;`
    : `box-shadow: 0 1px 8px rgba(0,0,0,0.08) !important;`}
}

/* Force nav text to always match theme */
nav, nav * {
  color: ${t.text} !important;
}

/* ── Text ── */
[style*="color: #f8fafc"],[style*="color: #f1f5f9"],
[style*="248, 250, 252"],[style*="241, 245, 249"] { color: ${t.textBright} !important; }

[style*="color: #e2e8f0"],[style*="226, 232, 240"] { color: ${t.text} !important; }
[style*="color: #cbd5e1"],[style*="203, 213, 225"] { color: ${t.textMuted} !important; }
[style*="color: #94a3b8"],[style*="148, 163, 184"] { color: ${t.textMuted} !important; }
[style*="color: #64748b"],[style*="100, 116, 139"] { color: ${t.textDim} !important; }
[style*="color: #475569"],[style*="71, 85, 105"]   { color: ${t.textDim} !important; }
[style*="color: #334155"],[style*="51, 65, 85"]    { color: ${t.textVeryDim} !important; }
[style*="color: #1e3050"],[style*="color: #0f2040"],
[style*="30, 48, 80"],[style*="15, 32, 64"]        { color: ${t.textVeryDim} !important; }

/* ── RGBA label text ── */
[style*="color: rgba(59, 130, 246"],[style*="color: rgba(59,130,246"] { color: ${t.accentAlt} !important; }
[style*="color: rgba(99, 102, 241"],[style*="color: rgba(99,102,241"] { color: ${t.accent} !important; }
[style*="color: rgba(148, 163, 184"],[style*="color: rgba(148,163,184"] { color: ${t.textMuted} !important; }
[style*="color: rgba(239, 68, 68"],[style*="color: rgba(239,68,68"]   { color: #f87171 !important; }
[style*="color: rgba(34, 197, 94"],[style*="color: rgba(34,197,94"]   { color: #4ade80 !important; }

/* ── Accent text ── */
[style*="color: #6366f1"] { color: ${t.accent} !important; }
[style*="color: #818cf8"] { color: ${t.accent} !important; }
[style*="color: #3b82f6"] { color: ${t.accentAlt} !important; }

/* ── Borders ── */
[style*="rgba(59, 130, 246, 0.1"],[style*="rgba(59,130,246,0.1"]   { border-color: ${t.border} !important; }
[style*="rgba(59, 130, 246, 0.16"],[style*="rgba(59,130,246,0.16"] { border-color: ${t.border} !important; }
[style*="rgba(59, 130, 246, 0.2"],[style*="rgba(59,130,246,0.2"]   { border-color: ${t.border} !important; }
[style*="rgba(59, 130, 246, 0.22"],[style*="rgba(59,130,246,0.22"] { border-color: ${t.border} !important; }
[style*="rgba(99, 102, 241, 0.2"],[style*="rgba(99,102,241,0.2"]   { border-color: ${t.accent}35 !important; }
[style*="rgba(99, 102, 241, 0.28"],[style*="rgba(99,102,241,0.28"] { border-color: ${t.accent}48 !important; }
[style*="rgba(99, 102, 241, 0.3"],[style*="rgba(99,102,241,0.3"]   { border-color: ${t.accent}50 !important; }
[style*="rgba(99, 102, 241, 0.4"],[style*="rgba(99,102,241,0.4"]   { border-color: ${t.accent}65 !important; }
[style*="rgba(99, 102, 241, 0.6"],[style*="rgba(99,102,241,0.6"]   { border-color: ${t.accent}99 !important; }

/* ── Accent backgrounds ── */
[style*="background: #6366f1"],[style*="background-color: #6366f1"] {
  background: ${t.accent} !important;
  background-color: ${t.accent} !important;
  ${!isLight ? `box-shadow: 0 0 20px ${t.accentGlow} !important;` : ''}
}
[style*="background: #22c55e"],[style*="background-color: #22c55e"] {
  background: #22c55e !important;
  ${!isLight ? `box-shadow: 0 0 16px rgba(34,197,94,0.4) !important;` : ''}
}
[style*="rgba(99, 102, 241, 0.08"],[style*="rgba(99,102,241,0.08"] { background: ${t.accent}12 !important; }
[style*="rgba(99, 102, 241, 0.1)"],[style*="rgba(99,102,241,0.1)"] { background: ${t.accent}1a !important; }
[style*="rgba(99, 102, 241, 0.12"],[style*="rgba(99,102,241,0.12"] { background: ${t.accent}1f !important; }
[style*="rgba(99, 102, 241, 0.2)"],[style*="rgba(99,102,241,0.2)"] { background: ${t.accent}35 !important; }

/* ── Inputs ── */
input, textarea, select {
  background-color: ${t.bgDarker} !important;
  color: ${t.text} !important;
  border-color: ${t.border} !important;
}
input::placeholder, textarea::placeholder { color: ${t.textDim} !important; }
input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px ${t.bgDarker} inset !important;
  -webkit-text-fill-color: ${t.text} !important;
}

/* ── Scrollbar ── */
::-webkit-scrollbar-track { background: ${t.bgDarker} !important; }
::-webkit-scrollbar-thumb { background: ${t.scrollThumb} !important; border-radius: 2px; }

/* ── Tooltip ── */
[style*="background: #0a1628"][style*="border"] {
  background: ${t.bgCard} !important;
  border-color: ${t.border} !important;
  color: ${t.text} !important;
}

/* ═══════════════════════════════════════════
   BLUEPRINT — subtle engineering precision
   ═══════════════════════════════════════════ */
${id === 'blueprint' ? `
h1, h2, h3 {
  color: #f8fafc !important;
}
/* Subtle glow on active accent buttons */
button:hover[style*="cursor: pointer"] {
  transition: all 0.2s ease !important;
}
` : ''}

/* ═══════════════════════════════════════════
   MATRIX — hacker terminal
   ═══════════════════════════════════════════ */
${id === 'matrix' ? `
* { font-family: 'Courier New', Courier, monospace !important; }

h1, h2, h3 {
  color: #00ff41 !important;
  text-shadow: 0 0 10px #00ff4190, 0 0 20px #00ff4140, 0 0 40px #00ff4120 !important;
  animation: vestrNeonPulse 3s ease-in-out infinite !important;
}

/* Logo text */
span[style*="letterSpacing"] {
  color: #00ff41 !important;
  text-shadow: 0 0 8px #00ff4170 !important;
}

/* Buttons */
button[style*="background: #6366f1"],
button[style*="background-color: #6366f1"] {
  background: #00ff41 !important;
  color: #000000 !important;
  font-family: 'Courier New', monospace !important;
  box-shadow: 0 0 20px #00ff4180, 0 0 40px #00ff4130 !important;
  letter-spacing: 0.1em !important;
}

/* Card borders pulse */
[style*="border: 1px solid rgba(59"],
[style*="border: 1px solid rgba(99"] {
  animation: vestrCardGlow 3s ease-in-out infinite !important;
}

/* Blinking cursor on monospace labels */
[style*="fontFamily: 'monospace'"]::after,
[style*='fontFamily: "monospace"']::after {
  content: '' !important;
}

/* CRT scanline overlay */
body::after {
  content: '' !important;
  position: fixed !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,255,65,0.015) 2px,
    rgba(0,255,65,0.015) 4px
  ) !important;
  pointer-events: none !important;
  z-index: 9999 !important;
}
` : ''}

/* ═══════════════════════════════════════════
   NEON — cyberpunk
   ═══════════════════════════════════════════ */
${id === 'neon' ? `
h1, h2, h3 {
  background: linear-gradient(135deg, #c084fc, #22d3ee) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  filter: drop-shadow(0 0 8px #c084fc60) !important;
}

/* Logo text gradient */
span[style*="letterSpacing: 1"] {
  background: linear-gradient(135deg, #c084fc, #22d3ee) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}

/* Animated gradient buttons */
button[style*="background: #6366f1"],
button[style*="background-color: #6366f1"] {
  background: linear-gradient(135deg, #c084fc 0%, #22d3ee 100%) !important;
  background-size: 200% 200% !important;
  animation: vestrGradientShift 3s ease infinite !important;
  box-shadow: 0 0 20px #c084fc70, 0 0 40px #22d3ee40 !important;
  color: #ffffff !important;
}

/* Cards get a soft outer glow */
[style*="border: 1px solid rgba(59"],
[style*="border: 1px solid rgba(99"] {
  box-shadow: 0 0 15px #c084fc18, 0 0 30px #22d3ee0a !important;
}

/* Nav bottom border glow */
nav {
  border-bottom: 1px solid #c084fc40 !important;
  box-shadow: 0 2px 20px #c084fc20, 0 0 40px #22d3ee10 !important;
}

/* Animated border on focused inputs */
input:focus, textarea:focus {
  border-color: #c084fc80 !important;
  box-shadow: 0 0 12px #c084fc40 !important;
  outline: none !important;
}
` : ''}

/* ═══════════════════════════════════════════
   HALLOWEEN — spooky
   ═══════════════════════════════════════════ */
${id === 'halloween' ? `
h1, h2, h3 {
  color: #fff7ed !important;
  text-shadow: 0 0 10px #f9731660, 0 0 20px #f9731630 !important;
  animation: vestrFlicker 6s ease-in-out infinite !important;
}

/* Logo text */
span[style*="letterSpacing: 1"] {
  color: #f97316 !important;
  text-shadow: 0 0 8px #f9731680 !important;
}

button[style*="background: #6366f1"],
button[style*="background-color: #6366f1"] {
  background: #f97316 !important;
  box-shadow: 0 0 20px #f9731680, 0 0 40px #f9731640 !important;
  color: #000000 !important;
}

nav {
  border-bottom: 1px solid #f9731630 !important;
  box-shadow: 0 1px 20px #f9731618 !important;
}

/* Card glow */
[style*="border: 1px solid rgba(59"],
[style*="border: 1px solid rgba(99"] {
  box-shadow: 0 0 10px #f9731612 !important;
  animation: vestrCardGlow 4s ease-in-out infinite !important;
}

/* CRT scanline overlay - spooky */
body::after {
  content: '' !important;
  position: fixed !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(249,115,22,0.012) 3px,
    rgba(249,115,22,0.012) 6px
  ) !important;
  pointer-events: none !important;
  z-index: 9999 !important;
}
` : ''}

/* ═══════════════════════════════════════════
   TERMINAL — retro amber
   ═══════════════════════════════════════════ */
${id === 'terminal' ? `
* { font-family: 'Courier New', Courier, monospace !important; }

h1, h2, h3 {
  color: #fef3c7 !important;
  text-shadow: 0 0 8px #f59e0b70, 0 0 16px #f59e0b40 !important;
}

/* Logo text */
span[style*="letterSpacing: 1"] {
  color: #f59e0b !important;
  text-shadow: 0 0 6px #f59e0b60 !important;
}

button[style*="background: #6366f1"],
button[style*="background-color: #6366f1"] {
  background: #f59e0b !important;
  color: #000000 !important;
  font-family: 'Courier New', monospace !important;
  box-shadow: 0 0 16px #f59e0b70 !important;
}

nav {
  border-bottom: 1px solid #f59e0b30 !important;
  box-shadow: 0 1px 20px #f59e0b10 !important;
}

/* Phosphor glow on cards */
[style*="border: 1px solid rgba(59"],
[style*="border: 1px solid rgba(99"] {
  box-shadow: 0 0 8px #f59e0b10 !important;
}

/* CRT phosphor scanlines */
body::after {
  content: '' !important;
  position: fixed !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(245,158,11,0.018) 2px,
    rgba(245,158,11,0.018) 4px
  ) !important;
  pointer-events: none !important;
  z-index: 9999 !important;
}

/* Blinking cursor on page labels */
[style*="letterSpacing: '0.1em'"]:first-child::after,
[style*='letterSpacing: "0.12em"']::after {
  content: '█' !important;
  animation: vestrBlink 1s step-end infinite !important;
  color: #f59e0b !important;
  margin-left: 3px !important;
}
` : ''}

/* ═══════════════════════════════════════════
   LIGHT — clean minimal
   ═══════════════════════════════════════════ */
${id === 'light' ? `
h1, h2, h3 {
  color: #0f172a !important;
  text-shadow: none !important;
}

/* Logo text */
span[style*="letterSpacing: 1"] {
  color: #0f172a !important;
}

nav {
  border-bottom: 1px solid rgba(99,102,241,0.12) !important;
  box-shadow: 0 1px 12px rgba(0,0,0,0.06) !important;
}

button[style*="background: #6366f1"],
button[style*="background-color: #6366f1"] {
  box-shadow: 0 2px 12px rgba(99,102,241,0.35) !important;
}

/* Cards get clean box shadows */
[style*="border: 1px solid rgba(59"],
[style*="border: 1px solid rgba(99"] {
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04) !important;
}

/* Buttons in light mode */
button {
  color: #0f172a !important;
}
button[style*="color: #94a3b8"] { color: #475569 !important; }
button[style*="color: #64748b"] { color: #334155 !important; }

/* All text must be dark */
* { -webkit-text-fill-color: unset !important; }
` : ''}

/* ── Verdict colors always stay regardless of theme ── */
[style*="color: #22c55e"],[style*="34, 197, 94"]  { color: #22c55e !important; -webkit-text-fill-color: #22c55e !important; }
[style*="color: #86efac"],[style*="134, 239, 172"] { color: #86efac !important; -webkit-text-fill-color: #86efac !important; }
[style*="color: #eab308"],[style*="234, 179, 8"]   { color: #eab308 !important; -webkit-text-fill-color: #eab308 !important; }
[style*="color: #ef4444"],[style*="239, 68, 68"]   { color: #ef4444 !important; -webkit-text-fill-color: #ef4444 !important; }
[style*="color: #4ade80"],[style*="74, 222, 128"]  { color: #4ade80 !important; -webkit-text-fill-color: #4ade80 !important; }
[style*="color: #f87171"],[style*="248, 113, 113"] { color: #f87171 !important; -webkit-text-fill-color: #f87171 !important; }
[style*="color: #f1f5f9"] { -webkit-text-fill-color: unset !important; }
`
}

function applyTheme(id: ThemeId) {
  document.body.setAttribute('data-theme', id)
  document.body.style.backgroundColor = THEMES[id].bg
  document.body.style.color           = THEMES[id].text

  let el = document.getElementById('vestr-theme') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'vestr-theme'
    document.head.appendChild(el)
  }
  el.textContent = buildCSS(id)

  // Override grid background-images via JS — CSS can't reach background-image inline styles
  const t = THEMES[id]
  const gridBg = [
    `linear-gradient(${t.gridColor} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${t.gridColor} 1px, transparent 1px)`,
    `linear-gradient(${t.gridFine} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${t.gridFine} 1px, transparent 1px)`,
  ].join(', ')

  document.querySelectorAll<HTMLElement>('[style]').forEach(el => {
    const bg = el.style.backgroundImage || ''
    if (bg.includes('59,130,246') || bg.includes('59, 130, 246')) {
      el.style.setProperty('background-image', gridBg, 'important')
      el.style.setProperty('background-color', t.bg, 'important')
    }
    // Fix any backgroundSize that goes with the grid
    if (el.style.backgroundSize?.includes('80px 80px')) {
      el.style.setProperty('background-size', '80px 80px, 80px 80px, 20px 20px, 20px 20px', 'important')
    }
  })
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem('vestr_theme') as ThemeId) || 'blueprint'
  })

  useEffect(() => { applyTheme(theme) }, [])

  const setTheme = (id: ThemeId) => {
    setThemeState(id)
    localStorage.setItem('vestr_theme', id)
    applyTheme(id)
    setTimeout(() => applyTheme(id), 100)
    setTimeout(() => applyTheme(id), 500)
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