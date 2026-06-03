import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  {
    id: '01',
    tag: 'COMMAND CENTER',
    title: 'Your base of operations.',
    desc: 'The Dashboard is your home. Portfolio value, live watchlist, and daily screener results — all in one place. Everything updates in real time.',
    visual: 'dashboard',
  },
  {
    id: '02',
    tag: 'SEARCH ENGINE',
    title: 'Find any stock instantly.',
    desc: 'Type any ticker — AAPL, TSLA, NVDA — and Vestr pulls 5 years of price data, computes every indicator, analyses live news, and generates a verdict. In seconds.',
    visual: 'search',
  },
  {
    id: '03',
    tag: 'VERDICT SYSTEM',
    title: 'One signal. Clear reasoning.',
    desc: 'STRONG BUY. BUY. WATCH. SELL. STRONG SELL. Every verdict is backed by RSI, MACD, Moving Averages, Bollinger Bands, OBV, and live news sentiment. Nothing is arbitrary.',
    visual: 'verdict',
  },
  {
    id: '04',
    tag: 'DAILY SCREENER',
    title: 'Best opportunities. Every morning.',
    desc: 'Must Buy and Must Sell scans 30+ stocks daily and ranks them by composite signal score. The strongest opportunities surface at the top — before the market moves.',
    visual: 'screener',
  },
  {
    id: '05',
    tag: 'BACKTEST ENGINE',
    title: 'Validated against 5 years of data.',
    desc: 'Every strategy is tested historically. Win rate, Sharpe ratio, max drawdown, and comparison against buy-and-hold. You see real performance before committing real money.',
    visual: 'backtest',
  },
]

const VERDICTS = ['STRONG BUY', 'BUY', 'WATCH', 'SELL']
const VERDICT_COLORS: Record<string, string> = {
  'STRONG BUY': '#22c55e', 'BUY': '#86efac',
  'WATCH': '#eab308', 'SELL': '#ef4444',
}

function DashboardVisual() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {[
        { label: 'PORTFOLIO', color: '#6366f1', val: '$14,832' },
        { label: 'MUST BUY',  color: '#22c55e', val: '3 signals' },
        { label: 'MUST SELL', color: '#ef4444', val: '2 signals' },
      ].map(m => (
        <div key={m.label} style={{ background: '#060d1f', border: `1px solid ${m.color}25`, borderRadius: 4, padding: 16 }}>
          <div style={{ height: 2, background: m.color, marginBottom: 10, borderRadius: 1, width: '60%' }} />
          <div style={{ fontSize: 9, color: `${m.color}80`, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 8 }}>{m.label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>{m.val}</div>
        </div>
      ))}
      <div style={{ gridColumn: '1 / 4', background: '#060d1f', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 4, padding: 14 }}>
        <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.5)', fontFamily: 'monospace', marginBottom: 8 }}>WATCHLIST</div>
        {['AAPL', 'NVDA', 'TSLA'].map((t, i) => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 2 ? '1px solid rgba(59,130,246,0.05)' : 'none' }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>{t}</span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#22c55e' }}>+1.2%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchVisual() {
  const [typed, setTyped] = useState('')
  const target = 'AAPL'
  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      setTyped(target.slice(0, i + 1))
      i++
      if (i >= target.length) { clearInterval(iv); setTimeout(() => setTyped(''), 1500) }
    }, 180)
    return () => clearInterval(iv)
  }, [])
  return (
    <div>
      <div style={{ background: '#060d1f', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#6366f1', fontFamily: 'monospace', fontSize: 14 }}>▸</span>
        <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0', letterSpacing: 2 }}>
          {typed}<span style={{ animation: 'blink 1s infinite', color: '#6366f1' }}>_</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        {['AAPL', 'NVDA', 'TSLA', 'META', 'MSFT', 'AMZN'].map(t => (
          <span key={t} style={{ fontSize: 10, fontFamily: 'monospace', color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '4px 10px', borderRadius: 2 }}>{t}</span>
        ))}
      </div>
    </div>
  )
}

function VerdictVisual() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setIdx(v => (v + 1) % VERDICTS.length), 1200)
    return () => clearInterval(iv)
  }, [])
  const v = VERDICTS[idx]
  const c = VERDICT_COLORS[v]
  return (
    <div style={{ background: '#060d1f', border: `1px solid ${c}20`, borderRadius: 4, padding: 24, textAlign: 'center' as const, transition: 'border-color 0.4s' }}>
      <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', letterSpacing: '0.14em', marginBottom: 12 }}>// VERDICT OUTPUT</div>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', color: c, transition: 'color 0.4s', letterSpacing: '-0.5px' }}>{v}</div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 16 }}>
        {[['RSI', '79.0', '#ef4444'], ['MACD', 'BULL', '#22c55e'], ['NEWS', 'BULL', '#86efac']].map(([l, val, col]) => (
          <div key={l} style={{ fontSize: 10, fontFamily: 'monospace' }}>
            <div style={{ color: 'rgba(59,130,246,0.4)', marginBottom: 2 }}>{l}</div>
            <div style={{ color: col as string, fontWeight: 700 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenerVisual() {
  const stocks = [
    { t: 'AMD',  v: 'STRONG BUY', c: '#22c55e', score: 4 },
    { t: 'META', v: 'BUY',        c: '#86efac', score: 3 },
    { t: 'JPM',  v: 'BUY',        c: '#86efac', score: 2 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', marginBottom: 4 }}>TOP SIGNALS TODAY</div>
      {stocks.map((s, i) => (
        <div key={s.t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#060d1f', border: `1px solid ${s.c}15`, borderRadius: 3, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{s.t}</span>
            <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>RANK #{i + 1}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: s.c, background: `${s.c}12`, border: `1px solid ${s.c}25`, padding: '2px 8px', borderRadius: 2 }}>{s.v}</span>
        </div>
      ))}
    </div>
  )
}

function BacktestVisual() {
  return (
    <div style={{ background: '#060d1f', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 4, padding: 20 }}>
      <svg viewBox="0 0 340 100" style={{ width: '100%', height: 80, marginBottom: 12 }}>
        <defs>
          <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#22c55e" stopOpacity="1"/>
          </linearGradient>
        </defs>
        <path d="M 0,80 L 40,72 L 80,68 L 120,58 L 160,62 L 200,45 L 240,38 L 280,25 L 340,10"
          fill="none" stroke="url(#tg)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 0,80 L 40,75 L 80,78 L 120,74 L 160,72 L 200,70 L 240,68 L 280,65 L 340,60"
          fill="none" stroke="rgba(59,130,246,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3"/>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { label: 'RETURN',    val: '+55.5%', color: '#22c55e' },
          { label: 'WIN RATE',  val: '100%',   color: '#22c55e' },
          { label: 'SHARPE',    val: '0.383',  color: '#94a3b8' },
          { label: 'DRAWDOWN',  val: '-17.3%', color: '#ef4444' },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.val}</div>
            <div style={{ fontSize: 8, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Tutorial() {
  const navigate        = useNavigate()
  const { user }        = useAuth()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const goTo = (next: number) => {
    setTransitioning(true)
    setTimeout(() => {
      setStep(next)
      setTransitioning(false)
    }, 350)
  }

  const finish = () => {
    setTransitioning(true)
    setTimeout(() => navigate('/dashboard'), 500)
  }

  const current = STEPS[step]

  const visuals: Record<string, React.ReactNode> = {
    dashboard : <DashboardVisual />,
    search    : <SearchVisual />,
    verdict   : <VerdictVisual />,
    screener  : <ScreenerVisual />,
    backtest  : <BacktestVisual />,
  }

  return (
    <>
      <style>{`
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.2}95%{opacity:.2}100%{transform:translateY(100vh);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
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
        transition: 'opacity 0.4s ease',
        display: 'flex', flexDirection: 'column' as const,
      }}>

        <div style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)', animation: 'scan 14s ease-in-out infinite', zIndex: 1, pointerEvents: 'none' as const }} />

        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(59,130,246,0.08)', position: 'relative' as const }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #22c55e)', transition: 'width 0.5s ease', width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 48px', borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(6,13,31,0.95)', backdropFilter: 'blur(16px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Vestr</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            SYSTEM ORIENTATION // STEP {step + 1} OF {STEPS.length}
          </div>
          <button onClick={finish} style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(59,130,246,0.15)', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', letterSpacing: '0.06em' }}>
            SKIP →
          </button>
        </nav>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px' }}>
          <div style={{ maxWidth: 960, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>

            {/* Left — Text */}
            <div style={{
              opacity: transitioning ? 0 : 1,
              transform: transitioning ? 'translateX(-12px)' : 'translateX(0)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}>
              <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.5)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 16 }}>
                CONCEPT_{current.id} // {current.tag}
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1px', marginBottom: 16, color: '#f1f5f9', lineHeight: 1.1 }}>
                {current.title}
              </h1>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32, fontFamily: 'monospace' }}>
                {current.desc}
              </p>

              {/* Step dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
                {STEPS.map((_, i) => (
                  <div key={i} style={{
                    width: i === step ? 24 : 6, height: 6,
                    borderRadius: 3, background: i === step ? '#6366f1' : i < step ? 'rgba(99,102,241,0.4)' : 'rgba(59,130,246,0.15)',
                    transition: 'all 0.3s ease', cursor: 'pointer',
                  }} onClick={() => goTo(i)} />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {step > 0 && (
                  <button onClick={() => goTo(step - 1)} style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(59,130,246,0.15)', padding: '10px 18px', borderRadius: 3, cursor: 'pointer', letterSpacing: '0.06em' }}>
                    ← PREV
                  </button>
                )}
                <button onClick={step < STEPS.length - 1 ? () => goTo(step + 1) : finish} style={{
                  fontSize: 12, fontWeight: 600, color: 'white', fontFamily: "'Space Grotesk', monospace", letterSpacing: '0.08em',
                  background: '#6366f1', border: '1px solid rgba(99,102,241,0.6)',
                  padding: '10px 24px', borderRadius: 3, cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(99,102,241,0.25)',
                }}>
                  {step < STEPS.length - 1 ? 'NEXT →' : 'ENTER VESTR →'}
                </button>
              </div>
            </div>

            {/* Right — Visual */}
            <div style={{
              opacity: transitioning ? 0 : 1,
              transform: transitioning ? 'translateX(12px)' : 'translateX(0)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.12)' }} />
                <span style={{ fontSize: 9, color: 'rgba(59,130,246,0.35)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                  VISUAL_{current.id} // {current.tag}
                </span>
                <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.12)' }} />
              </div>
              <div style={{ position: 'relative' as const }}>
                {[
                  { top: -6, left: -6, borderTop: '1.5px solid rgba(59,130,246,0.3)', borderLeft: '1.5px solid rgba(59,130,246,0.3)' },
                  { top: -6, right: -6, borderTop: '1.5px solid rgba(59,130,246,0.3)', borderRight: '1.5px solid rgba(59,130,246,0.3)' },
                  { bottom: -6, left: -6, borderBottom: '1.5px solid rgba(59,130,246,0.3)', borderLeft: '1.5px solid rgba(59,130,246,0.3)' },
                  { bottom: -6, right: -6, borderBottom: '1.5px solid rgba(59,130,246,0.3)', borderRight: '1.5px solid rgba(59,130,246,0.3)' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute' as const, width: 14, height: 14, ...s as React.CSSProperties }} />
                ))}
                <div style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 4, padding: 20 }}>
                  {visuals[current.visual]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}