import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { portfolioService, watchlistService, authService } from '../services/api'

type Section = 'profile' | 'portfolio' | 'watchlist' | 'appearance'
type ThemeId = 'blueprint' | 'matrix' | 'neon' | 'halloween' | 'light' | 'terminal'

export default function Settings() {
  const navigate                     = useNavigate()
  const { user, updateUser, logout } = useAuth()
  const { theme, setTheme }          = useTheme()
  const [section, setSection]        = useState<Section>('profile')

  const [portfolio, setPortfolio]       = useState<any[]>([])
  const [watchlist, setWatchlist]       = useState<any[]>([])
  const [portLoading, setPortLoading]   = useState(true)
  const [watchLoading, setWatchLoading] = useState(true)

  const [modeChanging, setModeChanging] = useState(false)
  const [modeMsg, setModeMsg]           = useState('')

  const [newTicker, setNewTicker] = useState('')
  const [newShares, setNewShares] = useState('')
  const [newPrice, setNewPrice]   = useState('')
  const [addMsg, setAddMsg]       = useState('')
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    portfolioService.getAll()
      .then(setPortfolio).catch(() => {})
      .finally(() => setPortLoading(false))
    watchlistService.getAll()
      .then(setWatchlist).catch(() => {})
      .finally(() => setWatchLoading(false))
  }, [])

  const switchMode = async (mode: 'rookie' | 'pro') => {
    if (mode === user?.mode) return
    setModeChanging(true)
    try {
      const updated = await authService.updatePreferences({ mode })
      updateUser(updated)
      setModeMsg(`MODE SWITCHED TO ${mode.toUpperCase()} ✓`)
      setTimeout(() => setModeMsg(''), 2500)
    } catch { setModeMsg('ERR: FAILED TO UPDATE MODE') }
    setModeChanging(false)
  }

  const removePortfolio = async (ticker: string) => {
    try {
      await portfolioService.remove(ticker)
      setPortfolio(prev => prev.filter(p => p.ticker !== ticker))
    } catch {}
  }

  const removeWatchlist = async (ticker: string) => {
    try {
      await watchlistService.remove(ticker)
      setWatchlist(prev => prev.filter(w => w.ticker !== ticker))
    } catch {}
  }

  const addPortfolioPosition = async () => {
    if (!newTicker || !newShares || !newPrice) { setAddMsg('ERR: ALL FIELDS REQUIRED'); return }
    setAddLoading(true)
    try {
      const item = await portfolioService.addPosition(newTicker.toUpperCase(), parseFloat(newShares), parseFloat(newPrice))
      setPortfolio(prev => [...prev, item])
      setNewTicker(''); setNewShares(''); setNewPrice('')
      setAddMsg('POSITION ADDED ✓')
      setTimeout(() => setAddMsg(''), 2000)
    } catch { setAddMsg('ERR: FAILED TO ADD POSITION') }
    setAddLoading(false)
  }

  const card: React.CSSProperties = {
    background: '#0a1628', border: '1px solid rgba(59,130,246,0.14)',
    borderRadius: 4, position: 'relative', overflow: 'hidden',
  }

  const inputStyle: React.CSSProperties = {
    background: '#060d1f', border: '1px solid rgba(59,130,246,0.18)',
    borderRadius: 3, padding: '9px 12px', fontSize: 12,
    color: '#e2e8f0', fontFamily: 'monospace', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  }

  const SECTIONS: { id: Section; label: string; tag: string }[] = [
    { id: 'profile',    label: 'Profile & Mode',  tag: 'USER'     },
    { id: 'portfolio',  label: 'Portfolio',        tag: 'HOLDINGS' },
    { id: 'watchlist',  label: 'Watchlist',        tag: 'TRACKED'  },
    { id: 'appearance', label: 'Appearance',       tag: 'THEME'    },
  ]

  const THEMES: { id: ThemeId; label: string; desc: string; colors: string[]; available: boolean }[] = [
    { id: 'blueprint', label: 'Blueprint',  desc: 'Navy + Indigo',       colors: ['#060d1f','#6366f1','#3b82f6'], available: true  },
    { id: 'matrix',    label: 'Matrix',     desc: 'Black + Green',        colors: ['#000000','#00ff41','#003b00'], available: true  },
    { id: 'neon',      label: 'Neon',       desc: 'Purple + Cyan',        colors: ['#0d0015','#c084fc','#22d3ee'], available: true  },
    { id: 'halloween', label: 'Halloween',  desc: 'Black + Orange',       colors: ['#0a0500','#f97316','#7c2d12'], available: true  },
    { id: 'terminal',  label: 'Terminal',   desc: 'Black + Amber',        colors: ['#000000','#f59e0b','#92400e'], available: true  },
    { id: 'light',     label: 'Light',      desc: 'Clean White',          colors: ['#f8fafc','#6366f1','#e2e8f0'], available: true  },
  ]

  return (
    <>
      <style>{`
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.2}95%{opacity:.2}100%{transform:translateY(100vh);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#040b18} ::-webkit-scrollbar-thumb{background:#1e3050;border-radius:2px}
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#060d1f',
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px),
          linear-gradient(rgba(59,130,246,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px, 80px 80px, 20px 20px, 20px 20px',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        color: '#e2e8f0',
      }}>

        <div style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)', animation: 'scan 16s ease-in-out infinite', zIndex: 1, pointerEvents: 'none' as const }} />

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 32px', borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(6,13,31,0.97)', backdropFilter: 'blur(20px)', position: 'sticky' as const, top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', letterSpacing: '0.06em' }}>
            ← DASHBOARD
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Vestr</span>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>SETTINGS</div>
        </nav>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>

          {/* Sidebar */}
          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>
            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 16 }}>
              SEC. SETTINGS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setSection(s.id)} style={{
                  background: section === s.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: section === s.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  borderRadius: 3, padding: '10px 14px', cursor: 'pointer',
                  textAlign: 'left' as const, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, color: section === s.id ? '#e2e8f0' : '#94a3b8', fontFamily: 'monospace' }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 8, color: section === s.id ? '#6366f1' : '#475569', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                    {s.tag}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(59,130,246,0.08)' }}>
              <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 11, fontFamily: 'monospace', padding: '9px 14px', borderRadius: 3, cursor: 'pointer', letterSpacing: '0.06em', textAlign: 'left' as const }}>
                ⏻ LOGOUT
              </button>
            </div>
          </div>

          {/* Main content */}
          <div style={{ animation: 'fadeUp 0.4s ease 0.15s both' }}>

            {/* ── PROFILE ─────────────────────────────────── */}
            {section === 'profile' && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 20 }}>MODULE // PROFILE & MODE</div>

                {/* Account info */}
                <div style={{ ...card, padding: 24, marginBottom: 16 }}>
                  <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)' }} />
                  <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.8)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 16 }}>ACCOUNT INFORMATION</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'USERNAME', value: user?.username || '—'                  },
                      { label: 'EMAIL',    value: user?.email    || '—'                  },
                      { label: 'MODE',     value: user?.mode?.toUpperCase() || 'ROOKIE'  },
                      { label: 'STATUS',   value: 'ACTIVE'                               },
                    ].map(f => (
                      <div key={f.label} style={{ background: '#060d1f', border: '1px solid rgba(59,130,246,0.07)', borderRadius: 3, padding: '12px 14px' }}>
                        <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 5 }}>{f.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mode selector */}
                <div style={{ ...card, padding: 24 }}>
                  <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)' }} />
                  <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.8)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 16 }}>INTERFACE MODE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    {(['rookie', 'pro'] as const).map(m => (
                      <button key={m} onClick={() => switchMode(m)} disabled={modeChanging} style={{
                        background: user?.mode === m ? (m === 'rookie' ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.1)') : '#060d1f',
                        border: user?.mode === m ? `1px solid ${m === 'rookie' ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.4)'}` : '1px solid rgba(59,130,246,0.1)',
                        borderRadius: 3, padding: '18px', cursor: 'pointer',
                        textAlign: 'left' as const, transition: 'all 0.2s', position: 'relative' as const,
                      }}>
                        {user?.mode === m && (
                          <div style={{ position: 'absolute' as const, top: 12, right: 12, width: 18, height: 18, borderRadius: '50%', background: m === 'rookie' ? '#22c55e' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, color: '#060d1f', fontWeight: 900 }}>✓</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                          {[1,2,3,4,5].map(i => (
                            <div key={i} style={{ width: 14, height: 4, borderRadius: 2, background: m === 'rookie' ? (i <= 2 ? '#22c55e' : 'rgba(59,130,246,0.12)') : '#6366f1' }} />
                          ))}
                          <span style={{ fontSize: 9, color: m === 'rookie' ? '#22c55e' : '#6366f1', fontFamily: 'monospace', marginLeft: 6 }}>
                            {m === 'rookie' ? 'EASY' : 'EXPERT'}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: m === 'rookie' ? 'rgba(34,197,94,0.7)' : 'rgba(99,102,241,0.7)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 6 }}>
                          {m === 'rookie' ? 'MODE_01' : 'MODE_02'}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
                          {m === 'rookie' ? 'ROOKIE' : 'PROFESSIONAL'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                          {m === 'rookie' ? 'Plain English explanations' : 'Raw data and indicators'}
                        </div>
                      </button>
                    ))}
                  </div>
                  {modeMsg && (
                    <div style={{ fontSize: 11, color: modeMsg.includes('ERR') ? '#f87171' : '#4ade80', fontFamily: 'monospace' }}>{modeMsg}</div>
                  )}
                </div>
              </div>
            )}

            {/* ── PORTFOLIO ───────────────────────────────── */}
            {section === 'portfolio' && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 20 }}>MODULE // PORTFOLIO POSITIONS</div>

                {/* Add position */}
                <div style={{ ...card, padding: 22, marginBottom: 16 }}>
                  <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #22c55e 0%, transparent 60%)' }} />
                  <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.8)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 14 }}>ADD NEW POSITION</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', marginBottom: 5 }}>TICKER</div>
                      <input value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())} placeholder="e.g. AAPL" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.18)'}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', marginBottom: 5 }}>SHARES</div>
                      <input value={newShares} onChange={e => setNewShares(e.target.value)} type="number" placeholder="e.g. 10" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.18)'}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', marginBottom: 5 }}>AVG BUY PRICE ($)</div>
                      <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="e.g. 150.00" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.18)'}
                      />
                    </div>
                    <button onClick={addPortfolioPosition} disabled={addLoading} style={{ background: '#22c55e', border: 'none', color: '#060d1f', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, padding: '10px 16px', borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                      {addLoading ? '...' : 'ADD →'}
                    </button>
                  </div>
                  {addMsg && (
                    <div style={{ fontSize: 10, color: addMsg.includes('ERR') ? '#f87171' : '#4ade80', fontFamily: 'monospace', marginTop: 10 }}>{addMsg}</div>
                  )}
                </div>

                {/* Position list */}
                <div style={{ ...card }}>
                  <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)' }} />
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.8)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                      CURRENT POSITIONS ({portfolio.length})
                    </div>
                  </div>
                  {portLoading ? (
                    <div style={{ padding: 20, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>LOADING...</div>
                  ) : portfolio.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center' as const, fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>NO POSITIONS YET — ADD ONE ABOVE</div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 110px 110px 1fr 80px', padding: '8px 20px', borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                        {['TICKER', 'SHARES', 'AVG PRICE', 'COST BASIS', '', 'ACTION'].map(h => (
                          <div key={h} style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>
                      {portfolio.map((p, i) => (
                        <div key={p.id || i} style={{ display: 'grid', gridTemplateColumns: '80px 80px 110px 110px 1fr 80px', padding: '12px 20px', borderBottom: i < portfolio.length - 1 ? '1px solid rgba(59,130,246,0.04)' : 'none', alignItems: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>{p.ticker}</div>
                          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0' }}>{p.shares}</div>
                          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0' }}>${(p.avg_buy_price || 0).toFixed(2)}</div>
                          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8' }}>${((p.shares || 0) * (p.avg_buy_price || 0)).toFixed(2)}</div>
                          <div />
                          <button onClick={() => removePortfolio(p.ticker)} style={{ fontSize: 10, color: '#f87171', fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', padding: '4px 8px', borderRadius: 2, cursor: 'pointer' }}>
                            REMOVE
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── WATCHLIST ───────────────────────────────── */}
            {section === 'watchlist' && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 20 }}>MODULE // WATCHLIST MANAGEMENT</div>
                <div style={{ ...card }}>
                  <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)' }} />
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(59,130,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.8)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                      TRACKED STOCKS ({watchlist.length})
                    </div>
                    <button onClick={() => navigate('/search')} style={{ fontSize: 9, color: '#818cf8', fontFamily: 'monospace', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.28)', padding: '3px 8px', borderRadius: 2, cursor: 'pointer' }}>
                      ADD STOCKS →
                    </button>
                  </div>
                  {watchLoading ? (
                    <div style={{ padding: 20, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>LOADING...</div>
                  ) : watchlist.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center' as const, fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>NO STOCKS ON WATCHLIST</div>
                  ) : (
                    <div>
                      {watchlist.map((w, i) => (
                        <div key={w.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < watchlist.length - 1 ? '1px solid rgba(59,130,246,0.05)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>{w.ticker}</span>
                            {w.name && <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{w.name}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={() => navigate(`/stock/${w.ticker}`)} style={{ fontSize: 10, color: '#818cf8', fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(99,102,241,0.2)', padding: '5px 12px', borderRadius: 2, cursor: 'pointer' }}>
                              VIEW →
                            </button>
                            <button onClick={() => removeWatchlist(w.ticker)} style={{ fontSize: 10, color: '#f87171', fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', padding: '5px 10px', borderRadius: 2, cursor: 'pointer' }}>
                              REMOVE
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── APPEARANCE ──────────────────────────────── */}
            {section === 'appearance' && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 20 }}>MODULE // APPEARANCE & THEMES</div>

                <div style={{ ...card, padding: 24 }}>
                  <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)' }} />
                  <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.8)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 6 }}>THEME SELECTION</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 20 }}>
                    Changes apply instantly across the entire app.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {THEMES.map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id)} style={{
                        background: theme === t.id ? 'rgba(99,102,241,0.1)' : '#060d1f',
                        border: theme === t.id ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(59,130,246,0.1)',
                        borderRadius: 4, padding: '18px', cursor: 'pointer',
                        textAlign: 'left' as const, transition: 'all 0.2s',
                        position: 'relative' as const,
                      }}
                      onMouseEnter={e => { if (theme !== t.id) e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)' }}
                      onMouseLeave={e => { if (theme !== t.id) e.currentTarget.style.borderColor = 'rgba(59,130,246,0.1)' }}
                      >
                        {theme === t.id && (
                          <div style={{ position: 'absolute' as const, top: 10, right: 10, fontSize: 9, color: '#6366f1', fontFamily: 'monospace', letterSpacing: '0.06em' }}>● ACTIVE</div>
                        )}

                        {/* Color swatches */}
                        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                          {t.colors.map((c, i) => (
                            <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)', boxShadow: theme === t.id ? `0 0 6px ${c}60` : 'none' }} />
                          ))}
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 20, padding: '12px 16px', background: '#060d1f', border: '1px solid rgba(59,130,246,0.07)', borderRadius: 3 }}>
                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', marginBottom: 4 }}>NOTE</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', lineHeight: 1.6 }}>
                      Theme preference is saved to your browser. The background, grid, and accent colours change immediately.
                      Full colour propagation across all components will be completed in the next update.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}