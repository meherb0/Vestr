import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'META', 'MSFT', 'GOOGL', 'AMZN', 'AMD', 'JPM', 'NFLX']
const RECENT_KEY = 'vestr_recent_searches'

export default function SearchPage() {
  const navigate         = useNavigate()
  const inputRef         = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(false)
  const [recent, setRecent]   = useState<string[]>([])
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true)
      setTimeout(() => inputRef.current?.focus(), 300)
    }, 60)
    const stored = localStorage.getItem(RECENT_KEY)
    if (stored) setRecent(JSON.parse(stored))
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const goBack = () => {
    setExiting(true)
    setTimeout(() => navigate('/dashboard'), 400)
  }

  const goToStock = (ticker: string) => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    const updated = [t, ...recent.filter(r => r !== t)].slice(0, 6)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
    navigate(`/stock/${t}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) goToStock(query)
  }

  return (
    <>
      <style>{`
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.2}95%{opacity:.2}100%{transform:translateY(100vh);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
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
        display: 'flex', flexDirection: 'column' as const,
        opacity: visible && !exiting ? 1 : 0,
        transform: visible && !exiting ? 'scale(1)' : 'scale(0.98)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}>

        <div style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)', animation: 'scan 14s ease-in-out infinite', zIndex: 1, pointerEvents: 'none' as const }} />

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 48px', borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(6,13,31,0.95)', backdropFilter: 'blur(16px)' }}>
          <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.06em' }}>
            ← BACK
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Vestr</span>
          </div>
          <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>ESC TO CLOSE</div>
        </nav>

        {/* Search area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

          <div style={{ width: '100%', maxWidth: 600, animation: 'fadeUp 0.5s ease 0.1s both' }}>

            <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.45)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 20, textAlign: 'center' as const }}>
              SEC. SEARCH // MARKET INTELLIGENCE ENGINE
            </div>

            <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1.5px', marginBottom: 32, textAlign: 'center' as const, color: '#f1f5f9' }}>
              Search the market.
            </h1>

            {/* Big search input */}
            <div style={{ position: 'relative' as const, marginBottom: 32 }}>
              {[
                { top: -7, left: -7, borderTop: '1.5px solid rgba(59,130,246,0.35)', borderLeft: '1.5px solid rgba(59,130,246,0.35)' },
                { top: -7, right: -7, borderTop: '1.5px solid rgba(59,130,246,0.35)', borderRight: '1.5px solid rgba(59,130,246,0.35)' },
                { bottom: -7, left: -7, borderBottom: '1.5px solid rgba(59,130,246,0.35)', borderLeft: '1.5px solid rgba(59,130,246,0.35)' },
                { bottom: -7, right: -7, borderBottom: '1.5px solid rgba(59,130,246,0.35)', borderRight: '1.5px solid rgba(59,130,246,0.35)' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute' as const, width: 14, height: 14, ...s as React.CSSProperties }} />
              ))}
              <form onSubmit={handleSubmit}>
                <div style={{ background: '#0a1628', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 4, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, color: '#6366f1', fontFamily: 'monospace' }}>▸</span>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value.toUpperCase())}
                    placeholder="ENTER TICKER SYMBOL..."
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 22, fontWeight: 700, fontFamily: 'monospace',
                      color: '#e2e8f0', letterSpacing: 2,
                    }}
                  />
                  <button type="submit" disabled={!query.trim()} style={{
                    background: query.trim() ? '#6366f1' : 'rgba(99,102,241,0.15)',
                    border: 'none', color: 'white', fontSize: 12, fontFamily: 'monospace',
                    letterSpacing: '0.08em', padding: '10px 18px', borderRadius: 3,
                    cursor: query.trim() ? 'pointer' : 'default',
                    transition: 'background 0.2s',
                  }}>SEARCH →</button>
                </div>
              </form>
            </div>

            {/* Recent searches */}
            {recent.length > 0 && (
              <div style={{ marginBottom: 24, animation: 'fadeUp 0.5s ease 0.2s both' }}>
                <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 10 }}>RECENT SEARCHES</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {recent.map(t => (
                    <button key={t} onClick={() => goToStock(t)} style={{
                      fontSize: 11, fontFamily: 'monospace', color: '#94a3b8',
                      background: '#0a1628', border: '1px solid rgba(59,130,246,0.15)',
                      padding: '5px 12px', borderRadius: 2, cursor: 'pointer',
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#e2e8f0' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#94a3b8' }}
                    >{t}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular stocks */}
            <div style={{ animation: 'fadeUp 0.5s ease 0.3s both' }}>
              <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 10 }}>POPULAR STOCKS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {POPULAR.map(t => (
                  <button key={t} onClick={() => goToStock(t)} style={{
                    fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1',
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
                    padding: '10px', borderRadius: 3, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.18)' }}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.07)' }} />
              <span style={{ fontSize: 9, color: '#1e3050', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                PRESS ENTER OR CLICK SEARCH // ESC TO RETURN
              </span>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.07)' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}