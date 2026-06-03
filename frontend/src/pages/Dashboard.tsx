import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { portfolioService, watchlistService, screenerService, stockService } from '../services/api'
import { PortfolioSummary, WatchlistItem, ScreenerResult } from '../types'

const VERDICT_COLORS: Record<string, string> = {
  'STRONG BUY' : '#22c55e',
  'BUY'        : '#86efac',
  'WATCH'      : '#eab308',
  'SELL'       : '#ef4444',
  'STRONG SELL': '#ef4444',
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const color = VERDICT_COLORS[verdict] || '#94a3b8'
  return (
    <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', color, background: `${color}15`, border: `1px solid ${color}35`, padding: '2px 8px', borderRadius: 2 }}>
      {verdict}
    </span>
  )
}

export default function Dashboard() {
  const navigate           = useNavigate()
  const { user, logout }   = useAuth()
  const userMenuRef        = useRef<HTMLDivElement>(null)
  const [visible, setVisible]           = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [portfolio, setPortfolio]       = useState<PortfolioSummary | null>(null)
  const [watchlist, setWatchlist]       = useState<WatchlistItem[]>([])
  const [watchSignals, setWatchSignals] = useState<Record<string, any>>({})
  const [screener, setScreener]         = useState<{ must_buy: ScreenerResult[]; must_sell: ScreenerResult[] } | null>(null)
  const [screenerLoading, setScreenerLoading]   = useState(false)
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [watchlistLoading, setWatchlistLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t  = setTimeout(() => setVisible(true), 80)
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [])

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    portfolioService.getSummary()
      .then(setPortfolio).catch(() => {})
      .finally(() => setPortfolioLoading(false))

    watchlistService.getAll()
      .then(items => {
        setWatchlist(items)
        setWatchlistLoading(false)
        items.forEach(item =>
          stockService.getSummary(item.ticker)
            .then(s => setWatchSignals(prev => ({ ...prev, [item.ticker]: s })))
            .catch(() => {})
        )
      })
      .catch(() => setWatchlistLoading(false))
  }, [])

  const runScreener = useCallback(async () => {
    setScreenerLoading(true)
    try { const r = await screenerService.run(); setScreener(r) }
    catch {} finally { setScreenerLoading(false) }
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const greeting = () => {
    const h = time.getHours()
    if (h < 12) return 'GOOD MORNING'
    if (h < 17) return 'GOOD AFTERNOON'
    return 'GOOD EVENING'
  }

  const pnlColor = portfolio && portfolio.total_pnl >= 0 ? '#22c55e' : '#ef4444'

  const card: React.CSSProperties = {
    background: '#0a1628',
    border: '1px solid rgba(59,130,246,0.16)',
    borderRadius: 4, position: 'relative', overflow: 'hidden',
  }

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
        opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease',
      }}>

        <div style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)', animation: 'scan 16s ease-in-out 1s infinite', zIndex: 1, pointerEvents: 'none' as const }} />

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '11px 32px', borderBottom: '1px solid rgba(59,130,246,0.12)', background: 'rgba(6,13,31,0.97)', backdropFilter: 'blur(20px)', position: 'sticky' as const, top: 0, zIndex: 100 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Vestr</span>
          </div>

          <button
            onClick={() => navigate('/search')}
            style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 3, padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'}
          >
            <span style={{ fontSize: 11, color: 'rgba(99,102,241,0.6)', fontFamily: 'monospace' }}>▸</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.05em' }}>SEARCH STOCKS</span>
          </button>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>

          <span style={{
            fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.08em',
            color: user?.mode === 'pro' ? '#818cf8' : '#4ade80',
            background: user?.mode === 'pro' ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)',
            border: `1px solid ${user?.mode === 'pro' ? 'rgba(99,102,241,0.3)' : 'rgba(34,197,94,0.3)'}`,
            padding: '3px 8px', borderRadius: 2,
          }}>
            {user?.mode?.toUpperCase() || 'ROOKIE'}
          </span>

          {/* User dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative' as const }}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              style={{ background: showUserMenu ? 'rgba(59,130,246,0.08)' : 'transparent', border: '1px solid rgba(59,130,246,0.22)', color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
            >
              {user?.username?.toUpperCase()}
              <span style={{ fontSize: 8, color: '#64748b' }}>{showUserMenu ? '▲' : '▼'}</span>
            </button>

            {showUserMenu && (
              <div style={{ position: 'absolute' as const, top: '100%', right: 0, marginTop: 4, background: '#0a1628', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4, overflow: 'hidden', minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', animation: 'fadeUp 0.15s ease', zIndex: 200 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{user?.email}</div>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings') }}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace', padding: '10px 14px', cursor: 'pointer', textAlign: 'left' as const, letterSpacing: '0.06em', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >⚙ SETTINGS</button>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid rgba(59,130,246,0.08)', color: '#f87171', fontSize: 11, fontFamily: 'monospace', padding: '10px 14px', cursor: 'pointer', textAlign: 'left' as const, letterSpacing: '0.06em', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >⏻ LOGOUT</button>
              </div>
            )}
          </div>
        </nav>

        {/* Content */}
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px' }}>

          <div style={{ marginBottom: 32, animation: 'fadeUp 0.5s ease 0.1s both' }}>
            <div style={{ fontSize: 10, color: 'rgba(99,102,241,0.6)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 6 }}>
              SEC. 01 // COMMAND CENTER
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#f8fafc' }}>
              {greeting()}, {user?.username?.toUpperCase()}.
            </h1>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 1fr', gap: 14, marginBottom: 20, animation: 'fadeUp 0.5s ease 0.15s both' }}>

            {/* Portfolio */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)' }} />
              <div style={{ fontSize: 9, color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 10 }}>MODULE // PORTFOLIO</div>
              {portfolioLoading ? (
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>LOADING...</div>
              ) : portfolio && portfolio.holdings_count > 0 ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-0.5px', marginBottom: 4 }}>
                    ${portfolio.total_current_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: pnlColor, marginBottom: 6 }}>
                    {portfolio.total_pnl >= 0 ? '+' : ''}{portfolio.total_pnl.toFixed(2)} ({portfolio.total_pnl_pct.toFixed(2)}%)
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {portfolio.holdings_count} POSITION{portfolio.holdings_count > 1 ? 'S' : ''} // COST ${portfolio.total_cost.toLocaleString()}
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 10 }}>NO POSITIONS YET</div>
                  <button onClick={() => navigate('/settings')} style={{ fontSize: 10, color: '#818cf8', fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(99,102,241,0.3)', padding: '5px 10px', borderRadius: 2, cursor: 'pointer' }}>
                    ADD POSITION →
                  </button>
                </div>
              )}
            </div>

            {/* Must Buy */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #22c55e 0%, transparent 60%)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'rgba(34,197,94,0.7)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>MODULE // MUST BUY</div>
                {!screener && (
                  <button onClick={runScreener} disabled={screenerLoading} style={{ fontSize: 9, color: '#4ade80', fontFamily: 'monospace', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: '3px 8px', borderRadius: 2, cursor: 'pointer' }}>
                    {screenerLoading ? 'SCANNING...' : 'RUN SCAN →'}
                  </button>
                )}
              </div>
              {screenerLoading ? (
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>SCANNING 30+ STOCKS...</div>
                  <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace', marginTop: 4 }}>THIS MAY TAKE 1-2 MINUTES</div>
                </div>
              ) : screener ? (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {screener.must_buy.slice(0, 3).map(s => (
                    <div key={s.ticker} onClick={() => navigate(`/stock/${s.ticker}`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '5px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>{s.ticker}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>${s.close.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#4ade80', fontFamily: 'monospace' }}>{(s.confidence * 100).toFixed(0)}%</span>
                        <VerdictBadge verdict={s.verdict} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>SCAN NOT YET RUN</div>
              )}
            </div>

            {/* Must Sell */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ef4444 0%, transparent 60%)' }} />
              <div style={{ fontSize: 9, color: 'rgba(239,68,68,0.7)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 12 }}>MODULE // MUST SELL</div>
              {screenerLoading ? (
                <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>SCANNING...</div>
              ) : screener ? (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {screener.must_sell.slice(0, 3).map(s => (
                    <div key={s.ticker} onClick={() => navigate(`/stock/${s.ticker}`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '5px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>{s.ticker}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>${s.close.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#f87171', fontFamily: 'monospace' }}>{(s.confidence * 100).toFixed(0)}%</span>
                        <VerdictBadge verdict={s.verdict} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>SCAN NOT YET RUN</div>
              )}
            </div>
          </div>

          {/* Watchlist */}
          <div style={{ ...card, animation: 'fadeUp 0.5s ease 0.25s both' }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 50%)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
              <div style={{ fontSize: 9, color: 'rgba(99,102,241,0.6)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                MODULE // WATCHLIST ({watchlist.length} TRACKED)
              </div>
              <button onClick={() => navigate('/search')} style={{ fontSize: 9, color: '#818cf8', fontFamily: 'monospace', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.28)', padding: '3px 8px', borderRadius: 2, cursor: 'pointer' }}>
                ADD STOCKS →
              </button>
            </div>

            {watchlistLoading ? (
              <div style={{ padding: 20, fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>LOADING WATCHLIST...</div>
            ) : watchlist.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center' as const }}>
                <div style={{ fontSize: 14, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 8 }}>NO STOCKS TRACKED YET</div>
                <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', marginBottom: 20 }}>SEARCH FOR A STOCK AND ADD IT TO YOUR WATCHLIST</div>
                <button onClick={() => navigate('/search')} style={{ fontSize: 12, color: '#818cf8', fontFamily: 'monospace', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.28)', padding: '9px 20px', borderRadius: 2, cursor: 'pointer' }}>
                  SEARCH STOCKS →
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 120px 60px', padding: '8px 20px', borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                  {['TICKER', 'NAME', 'PRICE', 'CHANGE', 'SIGNAL', ''].map(h => (
                    <div key={h} style={{ fontSize: 9, color: 'rgba(99,102,241,0.5)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{h}</div>
                  ))}
                </div>
                {watchlist.map((item, i) => {
                  const sig = watchSignals[item.ticker]
                  return (
                    <div key={item.id}
                      style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 120px 60px', padding: '12px 20px', cursor: 'pointer', borderBottom: i < watchlist.length - 1 ? '1px solid rgba(59,130,246,0.05)' : 'none', transition: 'background 0.15s' }}
                      onClick={() => navigate(`/stock/${item.ticker}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>{item.ticker}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.name || '—'}</div>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0' }}>{sig ? `$${sig.close.toFixed(2)}` : '—'}</div>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', color: sig ? (sig.change_pct >= 0 ? '#4ade80' : '#f87171') : '#64748b' }}>
                        {sig ? `${sig.change_pct >= 0 ? '+' : ''}${sig.change_pct.toFixed(2)}%` : '—'}
                      </div>
                      <div><VerdictBadge verdict="WATCH" /></div>
                      <div style={{ fontSize: 10, color: '#818cf8', fontFamily: 'monospace' }}>VIEW →</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.06)' }} />
            <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              DWG: VST-DASH // MODE: {user?.mode?.toUpperCase()} // USER: {user?.username?.toUpperCase()}
            </span>
            <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.06)' }} />
          </div>
        </div>
      </div>
    </>
  )
}