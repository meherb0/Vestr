import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/api'

export default function ModeSelect() {
  const navigate             = useNavigate()
  const { updateUser }       = useAuth()
  const [selected, setSelected] = useState<'rookie' | 'pro' | null>(null)
  const [hovered, setHovered]   = useState<'rookie' | 'pro' | null>(null)
  const [visible, setVisible]   = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const updated = await authService.updatePreferences({ mode: selected })
      updateUser(updated)
    } catch {}
    navigate('/tutorial')
  }

  const bgGlow = hovered === 'rookie'
    ? 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.07) 0%, transparent 60%)'
    : hovered === 'pro'
    ? 'radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.09) 0%, transparent 60%)'
    : 'none'

  return (
    <>
      <style>{`
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.2}95%{opacity:.2}100%{transform:translateY(100vh);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#060d1f',
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.045) 1px, transparent 1px),
          linear-gradient(rgba(59,130,246,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.018) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px, 80px 80px, 20px 20px, 20px 20px',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        color: '#e2e8f0',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.45s ease',
        display: 'flex', flexDirection: 'column' as const,
        position: 'relative' as const,
      }}>

        <div style={{ position: 'fixed' as const, inset: 0, background: bgGlow, transition: 'background 0.5s ease', pointerEvents: 'none' as const, zIndex: 0 }} />
        <div style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)', animation: 'scan 14s ease-in-out infinite', zIndex: 1, pointerEvents: 'none' as const }} />

        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(59,130,246,0.08)', position: 'relative' as const, zIndex: 2 }}>
          <div style={{ height: '100%', width: '33%', background: 'linear-gradient(90deg, #6366f1, #22c55e)', transition: 'width 0.6s ease' }} />
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 48px', borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(6,13,31,0.95)', backdropFilter: 'blur(16px)', position: 'relative' as const, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Vestr</span>
          </div>
        </nav>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '48px 24px', position: 'relative' as const, zIndex: 2 }}>
          <div style={{ width: '100%', maxWidth: 920 }}>

            {/* Header */}
            <div style={{ textAlign: 'center' as const, marginBottom: 52, animation: 'fadeUp 0.55s ease 0.05s both', opacity: 0 }}>
              <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.5)', fontFamily: 'monospace', letterSpacing: '0.16em', marginBottom: 16 }}>
                STEP 1 OF 3 // INTERFACE CONFIGURATION
              </div>
              <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-2.5px', marginBottom: 12, color: '#f8fafc', lineHeight: 1 }}>
                Select difficulty.
              </h1>
              <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                // HOW DO YOU WANT VESTR TO COMMUNICATE WITH YOU?
              </p>
            </div>

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>

              {/* ROOKIE */}
              <button
                onClick={() => setSelected('rookie')}
                onMouseEnter={() => setHovered('rookie')}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: selected === 'rookie' ? 'rgba(34,197,94,0.07)' : '#0a1628',
                  border: selected === 'rookie' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(59,130,246,0.12)',
                  borderRadius: 4, padding: 36,
                  cursor: 'pointer', textAlign: 'left' as const,
                  outline: 'none', transition: 'all 0.25s ease',
                  position: 'relative' as const, overflow: 'hidden',
                  animation: 'fadeUp 0.55s ease 0.15s both', opacity: 0,
                }}
              >
                <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, background: selected === 'rookie' ? 'linear-gradient(90deg, #22c55e, transparent)' : 'transparent', transition: 'background 0.3s' }} />
                {selected === 'rookie' && (
                  <div style={{ position: 'absolute' as const, top: 18, right: 18, width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: '#060d1f', fontWeight: 900 }}>✓</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 24 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ width: 20, height: 5, borderRadius: 2, background: i <= 2 ? '#22c55e' : 'rgba(59,130,246,0.12)' }} />
                  ))}
                  <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'monospace', marginLeft: 10, letterSpacing: '0.1em' }}>EASY</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(34,197,94,0.6)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 8 }}>MODE_01</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px', color: '#f8fafc', marginBottom: 6, lineHeight: 1 }}>ROOKIE</div>
                <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 22, letterSpacing: '0.04em' }}>Guided. Clear. No jargon.</div>
                <div style={{ height: 1, background: 'rgba(59,130,246,0.08)', marginBottom: 20 }} />
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, fontFamily: 'monospace', marginBottom: 24 }}>
                  Every signal comes with a plain English explanation. We tell you what RSI means, why the verdict was reached, and what to watch out for.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {['Plain English verdicts', 'Indicator explanations', 'Risk level guidance', 'Suggested entry prices', 'News summarised clearly'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: selected === 'rookie' ? '#22c55e' : '#334155', flexShrink: 0, transition: 'background 0.3s' }} />
                      <span style={{ fontSize: 12, color: selected === 'rookie' ? '#cbd5e1' : '#94a3b8', fontFamily: 'monospace', transition: 'color 0.3s' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </button>

              {/* PRO */}
              <button
                onClick={() => setSelected('pro')}
                onMouseEnter={() => setHovered('pro')}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: selected === 'pro' ? 'rgba(99,102,241,0.09)' : '#0a1628',
                  border: selected === 'pro' ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(59,130,246,0.12)',
                  borderRadius: 4, padding: 36,
                  cursor: 'pointer', textAlign: 'left' as const,
                  outline: 'none', transition: 'all 0.25s ease',
                  position: 'relative' as const, overflow: 'hidden',
                  animation: 'fadeUp 0.55s ease 0.28s both', opacity: 0,
                }}
              >
                <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, background: selected === 'pro' ? 'linear-gradient(90deg, #6366f1, transparent)' : 'transparent', transition: 'background 0.3s' }} />
                {selected === 'pro' && (
                  <div style={{ position: 'absolute' as const, top: 18, right: 18, width: 22, height: 22, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: 'white', fontWeight: 900 }}>✓</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 24 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ width: 20, height: 5, borderRadius: 2, background: '#6366f1' }} />
                  ))}
                  <span style={{ fontSize: 10, color: '#6366f1', fontFamily: 'monospace', marginLeft: 10, letterSpacing: '0.1em' }}>EXPERT</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(99,102,241,0.6)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 8 }}>MODE_02</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px', color: '#f8fafc', marginBottom: 6, lineHeight: 1 }}>PROFESSIONAL</div>
                <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 22, letterSpacing: '0.04em' }}>Raw. Direct. No hand-holding.</div>
                <div style={{ height: 1, background: 'rgba(59,130,246,0.08)', marginBottom: 20 }} />
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, fontFamily: 'monospace', marginBottom: 24 }}>
                  Raw indicator values, probability scores, confidence intervals, composite signal breakdown. Full backtest metrics. You know what you're looking at.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {['Raw RSI / MACD / OBV values', 'ML probability scores', 'Full backtest metrics', 'Sharpe ratio + max drawdown', 'Composite signal scoring'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: selected === 'pro' ? '#6366f1' : '#334155', flexShrink: 0, transition: 'background 0.3s' }} />
                      <span style={{ fontSize: 12, color: selected === 'pro' ? '#cbd5e1' : '#94a3b8', fontFamily: 'monospace', transition: 'color 0.3s' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </button>
            </div>

            {/* Confirm */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 14, animation: 'fadeUp 0.55s ease 0.38s both', opacity: 0 }}>
              <button
                onClick={handleConfirm}
                disabled={!selected || loading}
                style={{
                  background: selected ? '#6366f1' : 'rgba(99,102,241,0.1)',
                  border: selected ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(59,130,246,0.1)',
                  color: selected ? 'white' : '#475569',
                  fontSize: 14, fontWeight: 700,
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '0.08em',
                  padding: '14px 52px', borderRadius: 3,
                  cursor: selected ? 'pointer' : 'not-allowed',
                  transition: 'all 0.25s ease',
                  boxShadow: selected ? '0 0 32px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                {loading ? 'CONFIGURING...' : selected ? `CONFIRM ${selected.toUpperCase()} MODE →` : 'SELECT A MODE TO CONTINUE'}
              </button>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                // CHANGEABLE ANYTIME UNDER SETTINGS
              </span>
            </div>

            <div style={{ marginTop: 44, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeUp 0.55s ease 0.45s both', opacity: 0 }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.06)' }} />
              <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                STEP: 1/3 // NEXT: SYSTEM ORIENTATION // PREF: SAVED TO ACCOUNT
              </span>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.06)' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}