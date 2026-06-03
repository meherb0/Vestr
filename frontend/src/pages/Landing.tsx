import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const VERDICTS = ['STRONG BUY', 'BUY', 'WATCH', 'SELL', 'STRONG BUY']
const VERDICT_COLORS: Record<string, string> = {
  'STRONG BUY': '#22c55e',
  'BUY':        '#86efac',
  'WATCH':      '#eab308',
  'SELL':       '#ef4444',
}
const TICKER_ITEMS = [
  { ticker: 'AAPL',  price: '$312.06', change: '+1.2%', up: true  },
  { ticker: 'NVDA',  price: '$891.15', change: '+2.8%', up: true  },
  { ticker: 'TSLA',  price: '$174.22', change: '-0.8%', up: false },
  { ticker: 'META',  price: '$521.40', change: '+1.5%', up: true  },
  { ticker: 'MSFT',  price: '$415.60', change: '+0.4%', up: true  },
  { ticker: 'GOOGL', price: '$178.35', change: '-0.2%', up: false },
  { ticker: 'AMZN',  price: '$189.45', change: '+0.9%', up: true  },
  { ticker: 'AMD',   price: '$142.80', change: '+3.1%', up: true  },
  { ticker: 'JPM',   price: '$198.20', change: '+0.5%', up: true  },
  { ticker: 'DIS',   price: '$112.40', change: '-1.1%', up: false },
]

function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.12 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  )
}

function useCountUp(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration, start])
  return count
}

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'drawing' | 'text' | 'fading'>('drawing')
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'),   2000)
    const t2 = setTimeout(() => setPhase('fading'), 3400)
    const t3 = setTimeout(onComplete,               4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#060d1f',
      backgroundImage: `linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'fading' ? 0 : 1,
      transition: 'opacity 0.6s ease',
      pointerEvents: phase === 'fading' ? 'none' : 'all',
    }}>
      {[
        { top: 24, left: 24, borderTop: '1px solid rgba(59,130,246,0.35)', borderLeft: '1px solid rgba(59,130,246,0.35)' },
        { top: 24, right: 24, borderTop: '1px solid rgba(59,130,246,0.35)', borderRight: '1px solid rgba(59,130,246,0.35)' },
        { bottom: 24, left: 24, borderBottom: '1px solid rgba(59,130,246,0.35)', borderLeft: '1px solid rgba(59,130,246,0.35)' },
        { bottom: 24, right: 24, borderBottom: '1px solid rgba(59,130,246,0.35)', borderRight: '1px solid rgba(59,130,246,0.35)' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute' as const, width: 18, height: 18, ...s as React.CSSProperties }} />
      ))}
      <div style={{
        position: 'absolute' as const, top: 32, left: 48,
        fontSize: 10, color: 'rgba(59,130,246,0.35)', fontFamily: 'monospace', letterSpacing: '0.1em',
        opacity: phase !== 'drawing' ? 1 : 0, transition: 'opacity 0.5s ease 0.3s',
      }}>
        VESTR SYSTEMS // DOC: VST-001 // REV: A
      </div>
      <div style={{ width: 480, height: 90, marginBottom: 28 }}>
        <svg viewBox="0 0 480 90" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            d="M 0,75 L 48,68 L 96,78 L 144,62 L 192,72 L 240,55 L 288,65 L 336,48 L 384,30 L 432,15 L 480,4"
            fill="none" stroke="url(#loadGrad)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              strokeDasharray: 680,
              strokeDashoffset: phase === 'drawing' ? 680 : 0,
              transition: 'stroke-dashoffset 2.0s cubic-bezier(0.25,0.46,0.45,0.94)',
            }}
          />
          <circle cx="480" cy="4" r="5" fill="#6366f1"
            style={{ opacity: phase !== 'drawing' ? 1 : 0, filter: 'drop-shadow(0 0 10px #6366f1)', transition: 'opacity 0.3s ease 0.3s' }}
          />
        </svg>
      </div>
      <div style={{
        fontSize: 52, fontWeight: 800, letterSpacing: 12, color: 'white',
        fontFamily: 'Inter, system-ui, sans-serif',
        opacity: phase !== 'drawing' ? 1 : 0,
        transform: phase !== 'drawing' ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>VESTR</div>
      <div style={{
        fontSize: 11, color: 'rgba(59,130,246,0.5)', letterSpacing: 4, marginTop: 10, fontFamily: 'monospace',
        opacity: phase !== 'drawing' ? 1 : 0, transition: 'opacity 0.6s ease 0.2s',
      }}>INVESTMENT INTELLIGENCE SYSTEM</div>
    </div>
  )
}

function TickerTape() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div style={{ borderBottom: '1px solid rgba(59,130,246,0.12)', background: '#040b18', height: 32, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: 'flex', animation: 'ticker 38s linear infinite', whiteSpace: 'nowrap' as const }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', borderRight: '1px solid rgba(59,130,246,0.08)', height: 32, fontFamily: 'monospace' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>{item.ticker}</span>
            <span style={{ fontSize: 11, color: '#334155' }}>{item.price}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: item.up ? '#22c55e' : '#ef4444' }}>{item.change}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate                          = useNavigate()
  const [loaded, setLoaded]               = useState(false)
  const [activeVerdict, setActiveVerdict] = useState(0)
  const [heroVisible, setHeroVisible]     = useState(false)
  const statsCount                        = useCountUp(18000, 2000, heroVisible)
  const [overlay, setOverlay]             = useState<{
    x: number; y: number; w: number; h: number; color: string; expanded: boolean
  } | null>(null)

  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => setHeroVisible(true), 100)
    return () => clearTimeout(t)
  }, [loaded])

  useEffect(() => {
    if (!loaded) return
    const iv = setInterval(() => setActiveVerdict(v => (v + 1) % VERDICTS.length), 2500)
    return () => clearInterval(iv)
  }, [loaded])

  const verdict      = VERDICTS[activeVerdict]
  const verdictColor = VERDICT_COLORS[verdict]

  const goTo = (path: string, color: string = '#6366f1') => (e: React.MouseEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setOverlay({ x: rect.left, y: rect.top, w: rect.width, h: rect.height, color, expanded: false })
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setOverlay(prev => prev ? { ...prev, expanded: true } : null)
    }))
    setTimeout(() => navigate(path), 520)
  }

  const fade = (delay: number): React.CSSProperties => ({
    opacity: heroVisible ? 1 : 0,
    animation: heroVisible ? `fadeUp 0.6s ease ${delay}s both` : 'none',
  })

  return (
    <>
      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}

      <style>{`
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.3}95%{opacity:.3}100%{transform:translateY(100vh);opacity:0}}
        @keyframes crosshair{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.6)}}
      `}</style>

      {overlay && (
        <div style={{
          position: 'fixed',
          top    : overlay.expanded ? 0        : overlay.y,
          left   : overlay.expanded ? 0        : overlay.x,
          width  : overlay.expanded ? '100vw'  : overlay.w,
          height : overlay.expanded ? '100vh'  : overlay.h,
          background: overlay.color,
          zIndex: 10000,
          borderRadius: overlay.expanded ? 0 : 3,
          transition: overlay.expanded
            ? 'top 0.48s cubic-bezier(0.4,0,0.2,1), left 0.48s cubic-bezier(0.4,0,0.2,1), width 0.48s cubic-bezier(0.4,0,0.2,1), height 0.48s cubic-bezier(0.4,0,0.2,1), border-radius 0.48s'
            : 'none',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{
        minHeight: '100vh', background: '#060d1f',
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.045) 1px, transparent 1px),
          linear-gradient(rgba(59,130,246,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.018) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px, 80px 80px, 20px 20px, 20px 20px',
        color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif',
        opacity: loaded ? 1 : 0, transition: 'opacity 0.6s ease 0.1s',
        position: 'relative' as const, overflow: 'hidden',
      }}>

        <div style={{
          position: 'absolute' as const, top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.25), transparent)',
          animation: 'scan 14s ease-in-out 2s infinite',
          zIndex: 1, pointerEvents: 'none' as const,
        }} />

        <TickerTape />

        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 48px', borderBottom: '1px solid rgba(59,130,246,0.1)',
          position: 'sticky' as const, top: 0, zIndex: 100,
          background: 'rgba(6,13,31,0.95)', backdropFilter: 'blur(16px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Vestr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={goTo('/login', '#0a1628')} style={{
              color: '#cbd5e1', fontSize: 12, padding: '7px 16px',
              border: '1px solid rgba(99,102,241,0.3)',
              fontFamily: 'monospace', letterSpacing: '0.05em', borderRadius: 3,
              background: 'transparent', cursor: 'pointer',
            }}>SIGN IN</button>
            <button onClick={goTo('/register', '#6366f1')} style={{
              color: 'white', fontSize: 12, padding: '7px 18px',
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.6)',
              fontFamily: 'monospace', letterSpacing: '0.07em', borderRadius: 3,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>ACCESS SYSTEM <span>→</span></button>
          </div>
        </nav>

        <section style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          minHeight: 'calc(100vh - 97px)',
          maxWidth: 1320, margin: '0 auto',
          padding: '0 48px', alignItems: 'center', gap: 48,
        }}>
          <div style={{ paddingTop: 40, paddingBottom: 40 }}>
            <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.45)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 24, ...fade(0) }}>
              SEC. 01 // SYSTEM OVERVIEW
            </div>
            <h1 style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1.02, marginBottom: 24, color: '#f1f5f9', ...fade(0.1) }}>
              Know what<br />to buy.<br />
              <span style={{ color: 'transparent', WebkitTextStroke: '2px #6366f1' }}>Before<br />everyone<br />else.</span>
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 36, maxWidth: 380, fontFamily: 'monospace', ...fade(0.2) }}>
              ML signal engine + technical indicators + real-time news sentiment → one clear verdict on any stock.
            </p>
            <div style={{ display: 'flex', gap: 10, ...fade(0.3) }}>
              <button onClick={goTo('/register', '#6366f1')} style={{
                background: '#6366f1', color: 'white', border: 'none',
                fontSize: 12, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.08em',
                padding: '12px 22px', borderRadius: 3, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 0 28px rgba(99,102,241,0.3)',
              }}>INITIALIZE SYSTEM →</button>
              <button onClick={goTo('/login', '#0a1628')} style={{
                background: 'transparent', color: '#94a3b8', border: '1px solid rgba(59,130,246,0.2)',
                fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.06em',
                padding: '12px 22px', borderRadius: 3, cursor: 'pointer',
              }}>SIGN IN</button>
            </div>
            <div style={{ marginTop: 44, paddingTop: 32, borderTop: '1px solid rgba(59,130,246,0.1)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, ...fade(0.4) }}>
              {[
                { value: statsCount >= 18000 ? '18,000+' : statsCount.toLocaleString(), label: 'TRAINING SAMPLES', note: '// records' },
                { value: '15',   label: 'SECTORS',    note: '// industries' },
                { value: '5 YR', label: 'HIST. DATA', note: '// validated'  },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.45)', letterSpacing: '0.1em', marginTop: 4, fontFamily: 'monospace' }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: '#1e3050', marginTop: 2, fontFamily: 'monospace' }}>{s.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...fade(0.15) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.15)' }} />
              <span style={{ fontSize: 9, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>COMPONENT 01 // VERDICT ENGINE</span>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.15)' }} />
            </div>
            <div style={{ position: 'relative' as const }}>
              {[
                { top: -7, left: -7, borderTop: '1.5px solid rgba(59,130,246,0.45)', borderLeft: '1.5px solid rgba(59,130,246,0.45)' },
                { top: -7, right: -7, borderTop: '1.5px solid rgba(59,130,246,0.45)', borderRight: '1.5px solid rgba(59,130,246,0.45)' },
                { bottom: -7, left: -7, borderBottom: '1.5px solid rgba(59,130,246,0.45)', borderLeft: '1.5px solid rgba(59,130,246,0.45)' },
                { bottom: -7, right: -7, borderBottom: '1.5px solid rgba(59,130,246,0.45)', borderRight: '1.5px solid rgba(59,130,246,0.45)' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute' as const, width: 18, height: 18, ...s as React.CSSProperties }} />
              ))}
              <div style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ padding: '9px 14px', background: '#060d1f', borderBottom: '1px solid rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', opacity: 0.8 }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', opacity: 0.8 }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', opacity: 0.8 }} />
                  <div style={{ flex: 1, marginLeft: 6, background: '#0a1628', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 2, padding: '3px 10px', fontSize: 10, color: '#1e3050', fontFamily: 'monospace' }}>vestr.app/stock/AAPL</div>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>AAPL</span>
                        <span style={{ fontSize: 9, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', padding: '2px 7px', borderRadius: 2, fontFamily: 'monospace' }}>NASDAQ</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#1e3050', fontFamily: 'monospace' }}>APPLE INC // LIVE</span>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>$312.06</div>
                      <div style={{ fontSize: 11, color: '#22c55e', fontFamily: 'monospace' }}>+$3.72 (+1.2%)</div>
                    </div>
                  </div>
                  <div style={{ background: '#060d1f', border: `1px solid ${verdictColor}20`, borderRadius: 3, padding: 20, marginBottom: 12, textAlign: 'center' as const, transition: 'border-color 0.5s ease', position: 'relative' as const, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' as const }}>
                      <svg width="110" height="110" style={{ opacity: 0.07, animation: 'crosshair 30s linear infinite' }}>
                        <line x1="55" y1="0" x2="55" y2="110" stroke={verdictColor} strokeWidth="1"/>
                        <line x1="0" y1="55" x2="110" y2="55" stroke={verdictColor} strokeWidth="1"/>
                        <circle cx="55" cy="55" r="36" stroke={verdictColor} strokeWidth="1" fill="none" strokeDasharray="4 4"/>
                        <circle cx="55" cy="55" r="18" stroke={verdictColor} strokeWidth="1" fill="none"/>
                        <circle cx="55" cy="55" r="4" stroke={verdictColor} strokeWidth="1" fill="none"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.35)', letterSpacing: '0.14em', fontFamily: 'monospace', marginBottom: 8 }}>// VERDICT OUTPUT</div>
                    <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1, color: verdictColor, transition: 'color 0.5s ease', fontFamily: 'monospace' }}>{verdict}</div>
                    <div style={{ marginTop: 8, fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
                      CONF: <span style={{ color: '#e2e8f0' }}>65%</span>
                      <span style={{ margin: '0 8px', color: '#0f2040' }}>|</span>
                      ENTRY: <span style={{ color: '#e2e8f0' }}>~$305.68</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                    {[
                      { label: 'RSI_14', value: '79.0', note: 'OVERBOUGHT', color: '#ef4444' },
                      { label: 'MACD',   value: 'BULL', note: 'CROSS↑',     color: '#22c55e' },
                      { label: 'NEWS',   value: 'BULL', note: '+40%',        color: '#86efac' },
                    ].map(d => (
                      <div key={d.label} style={{ background: '#060d1f', border: '1px solid rgba(59,130,246,0.07)', borderRadius: 2, padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.35)', fontFamily: 'monospace', marginBottom: 3 }}>{d.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: d.color, fontFamily: 'monospace' }}>{d.value}</div>
                        <div style={{ fontSize: 9, color: '#1e3050', fontFamily: 'monospace', marginTop: 2 }}>{d.note}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(234,179,8,0.03)', border: '1px solid rgba(234,179,8,0.1)', borderRadius: 2, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, color: '#eab308' }}>⚑</span>
                    <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>WARN: RSI79 OVERBOUGHT — AWAIT PULLBACK TO $305</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.08)' }} />
                <span style={{ fontSize: 9, color: '#1e3050', fontFamily: 'monospace', letterSpacing: '0.06em' }}>DWG: VST-001 // SCALE: 1:1 // UNITS: USD</span>
                <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.08)' }} />
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '60px 48px', maxWidth: 1320, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
              <div style={{ height: 1, background: 'rgba(59,130,246,0.12)', width: 40 }} />
              <span style={{ fontSize: 10, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>SEC. 02 // COMPONENT SPECIFICATIONS</span>
              <div style={{ height: 1, background: 'rgba(59,130,246,0.12)', flex: 1 }} />
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <Reveal style={{ gridColumn: '1 / 3' }}>
              <div style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 4, padding: 28, position: 'relative' as const, overflow: 'hidden', height: '100%' }}>
                <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)' }} />
                <div style={{ fontSize: 10, color: '#6366f1', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 12 }}>MODULE 01 // ML SIGNAL ENGINE</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.3px' }}>ML Signal Engine</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 20, maxWidth: 500, fontFamily: 'monospace' }}>
                  Random Forest classifier trained on 18,000 data points across 15 sectors. Outputs BUY / SELL / HOLD with probability scores for all three classes.
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {['RSI', 'MACD', 'SMA_10', 'SMA_50', 'BOLLINGER', 'OBV'].map(tag => (
                    <span key={tag} style={{ fontSize: 10, color: '#6366f1', fontFamily: 'monospace', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', padding: '3px 8px', borderRadius: 2 }}>{tag}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            {[
              { id: '02', color: '#22c55e', tag: 'NEWS FEED',  title: 'Sentiment Engine', desc: 'VADER analysis on live headlines from Reuters, CNBC, Yahoo Finance. Weighted by source and recency.' },
              { id: '03', color: '#eab308', tag: 'VALIDATION', title: '5-Year Backtest',  desc: 'Strategy simulation on historical data. 15% stop-loss, 20-day cooldown after trigger.' },
              { id: '04', color: '#f97316', tag: 'SCREENER',   title: 'Must Buy / Sell',  desc: '30+ stocks scanned daily. Top signals ranked by composite score and confidence.' },
              { id: '05', color: '#a78bfa', tag: 'TRACKER',    title: 'Portfolio P&L',    desc: 'Real-time profit and loss. Avg buy price tracked with weighted entry calculation.' },
              { id: '06', color: '#38bdf8', tag: 'INTERFACE',  title: 'Rookie & Pro',     desc: 'Plain English for beginners. Raw indicator data for experienced traders. Persisted per user.' },
            ].map((f, i) => (
              <Reveal key={f.id} delay={i * 0.08}>
                <div style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 4, padding: 22, position: 'relative' as const, overflow: 'hidden', height: '100%' }}>
                  <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, ${f.color} 0%, transparent 70%)` }} />
                  <div style={{ fontSize: 9, color: `${f.color}80`, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 10 }}>MODULE {f.id} // {f.tag}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65, fontFamily: 'monospace' }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section style={{ borderTop: '1px solid rgba(59,130,246,0.08)', padding: '80px 48px', textAlign: 'center' as const, position: 'relative' as const }}>
          {[
            { top: 24, left: 48, borderTop: '1px solid rgba(59,130,246,0.25)', borderLeft: '1px solid rgba(59,130,246,0.25)' },
            { top: 24, right: 48, borderTop: '1px solid rgba(59,130,246,0.25)', borderRight: '1px solid rgba(59,130,246,0.25)' },
            { bottom: 24, left: 48, borderBottom: '1px solid rgba(59,130,246,0.25)', borderLeft: '1px solid rgba(59,130,246,0.25)' },
            { bottom: 24, right: 48, borderBottom: '1px solid rgba(59,130,246,0.25)', borderRight: '1px solid rgba(59,130,246,0.25)' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute' as const, width: 16, height: 16, ...s as React.CSSProperties }} />
          ))}
          <Reveal>
            <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.35)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 24 }}>SEC. 03 // SYSTEM ACCESS</div>
            <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 14, color: '#f1f5f9' }}>Ready to invest smarter?</h2>
            <p style={{ color: '#334155', marginBottom: 36, fontSize: 13, fontFamily: 'monospace' }}>// FREE TO USE // NO CREDIT CARD // SETUP &lt;2 MIN</p>
            <button onClick={goTo('/register', '#6366f1')} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#6366f1', color: 'white', border: 'none',
              fontSize: 13, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.1em',
              padding: '14px 32px', borderRadius: 3, cursor: 'pointer',
              boxShadow: '0 0 40px rgba(99,102,241,0.25)',
            }}>INITIALIZE SYSTEM →</button>
          </Reveal>
        </section>

        <footer style={{ borderTop: '1px solid rgba(59,130,246,0.08)', padding: '16px 48px', background: '#040b18', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>VESTR</span>
          </div>
          <span style={{ fontSize: 10, color: '#0f2040', fontFamily: 'monospace' }}>DOC: VST-001 // REV: A // DATE: 2026.06 // SCALE: NTS</span>
        </footer>

      </div>
    </>
  )
}