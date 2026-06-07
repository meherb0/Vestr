import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const RECENT_KEY = 'vestr_recent_searches'
const MAX_RECENT = 6

const COMPANY_MAP: Record<string, string> = {
  'apple': 'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'alphabet': 'GOOGL',
  'amazon': 'AMZN', 'meta': 'META', 'facebook': 'META', 'instagram': 'META',
  'whatsapp': 'META', 'nvidia': 'NVDA', 'tesla': 'TSLA', 'netflix': 'NFLX',
  'disney': 'DIS', 'uber': 'UBER', 'shopify': 'SHOP', 'jpmorgan': 'JPM',
  'jp morgan': 'JPM', 'bank of america': 'BAC', 'bofa': 'BAC', 'goldman': 'GS',
  'goldman sachs': 'GS', 'visa': 'V', 'mastercard': 'MA', 'walmart': 'WMT',
  'nike': 'NKE', "mcdonald's": 'MCD', 'mcdonalds': 'MCD', 'johnson & johnson': 'JNJ',
  'johnson and johnson': 'JNJ', 'pfizer': 'PFE', 'unitedhealth': 'UNH',
  'united health': 'UNH', 'abbvie': 'ABBV', 'exxon': 'XOM', 'exxonmobil': 'XOM',
  'exxon mobil': 'XOM', 'chevron': 'CVX', 'amd': 'AMD', 'advanced micro devices': 'AMD',
  'intel': 'INTC', 'salesforce': 'CRM', 'adobe': 'ADBE', 'paypal': 'PYPL',
  'block': 'SQ', 'square': 'SQ', 'snapchat': 'SNAP', 'snap': 'SNAP',
  'spotify': 'SPOT', 'airbnb': 'ABNB', 'doordash': 'DASH', 'coinbase': 'COIN',
  'palantir': 'PLTR', 'snowflake': 'SNOW', 'crowdstrike': 'CRWD', 'datadog': 'DDOG',
  'cloudflare': 'NET', 'mongodb': 'MDB', 'oracle': 'ORCL', 'ibm': 'IBM',
  'qualcomm': 'QCOM', 'broadcom': 'AVGO', 'arm': 'ARM', 'arm holdings': 'ARM',
  'tsmc': 'TSM', 'taiwan semiconductor': 'TSM', 'berkshire': 'BRK-B',
  'berkshire hathaway': 'BRK-B', 'robinhood': 'HOOD', 'lyft': 'LYFT',
}

const COMPANY_DISPLAY: Record<string, string> = {
  'AAPL':'Apple Inc.','MSFT':'Microsoft','GOOGL':'Alphabet','AMZN':'Amazon',
  'META':'Meta Platforms','NVDA':'NVIDIA','TSLA':'Tesla','NFLX':'Netflix',
  'DIS':'Disney','UBER':'Uber','SHOP':'Shopify','JPM':'JPMorgan Chase',
  'BAC':'Bank of America','GS':'Goldman Sachs','V':'Visa','MA':'Mastercard',
  'WMT':'Walmart','NKE':'Nike','MCD':"McDonald's",'JNJ':'Johnson & Johnson',
  'PFE':'Pfizer','UNH':'UnitedHealth','ABBV':'AbbVie','XOM':'ExxonMobil',
  'CVX':'Chevron','AMD':'AMD','INTC':'Intel','CRM':'Salesforce','ADBE':'Adobe',
  'PYPL':'PayPal','SQ':'Block','SNAP':'Snap','SPOT':'Spotify','ABNB':'Airbnb',
  'DASH':'DoorDash','COIN':'Coinbase','PLTR':'Palantir','SNOW':'Snowflake',
  'CRWD':'CrowdStrike','DDOG':'Datadog','NET':'Cloudflare','MDB':'MongoDB',
  'ORCL':'Oracle','IBM':'IBM','QCOM':'Qualcomm','AVGO':'Broadcom',
  'ARM':'ARM Holdings','TSM':'TSMC',
}

const POPULAR = ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','NFLX','AMD','JPM']

function resolveSearch(q: string): string {
  return COMPANY_MAP[q.toLowerCase().trim()] || q.toUpperCase().trim()
}

function getCompanyMatch(q: string): { ticker: string; name: string } | null {
  if (!q || q.length < 2) return null
  const lower = q.toLowerCase().trim()
  const exact = COMPANY_MAP[lower]
  if (exact) return { ticker: exact, name: COMPANY_DISPLAY[exact] || exact }
  for (const [name, ticker] of Object.entries(COMPANY_MAP)) {
    if (name.startsWith(lower) && lower.length >= 3)
      return { ticker, name: COMPANY_DISPLAY[ticker] || ticker }
  }
  return null
}

export default function SearchPage() {
  const navigate  = useNavigate()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [query, setQuery]   = useState('')
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate('/dashboard') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const addRecent = (ticker: string) => {
    const updated = [ticker, ...recent.filter(r => r !== ticker)].slice(0, MAX_RECENT)
    setRecent(updated)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  }

  const goTo = (raw: string) => {
    if (!raw.trim()) return
    const ticker = resolveSearch(raw)
    addRecent(ticker)
    navigate(`/stock/${ticker}`)
  }

  const match   = getCompanyMatch(query)
  const hasMatch = match && query.length >= 2

  const card: React.CSSProperties = {
    background: '#0a1628', border: '1px solid rgba(59,130,246,0.14)',
    borderRadius: 4, position: 'relative', overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.2}95%{opacity:.2}100%{transform:translateY(100vh);opacity:0}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#040b18}::-webkit-scrollbar-thumb{background:#1e3050;border-radius:2px}
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#060d1f',
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),
          linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px),
          linear-gradient(rgba(59,130,246,0.015) 1px,transparent 1px),
          linear-gradient(90deg,rgba(59,130,246,0.015) 1px,transparent 1px)
        `,
        backgroundSize: '80px 80px,80px 80px,20px 20px,20px 20px',
        fontFamily: "'Space Grotesk',system-ui,sans-serif", color: '#e2e8f0',
      }}>
        <div style={{ position:'fixed',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(59,130,246,0.2),transparent)',animation:'scan 16s ease-in-out infinite',zIndex:1,pointerEvents:'none' }} />

        {/* Nav */}
        <nav style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 32px',borderBottom:'1px solid rgba(59,130,246,0.1)',background:'rgba(6,13,31,0.97)',backdropFilter:'blur(20px)',position:'sticky',top:0,zIndex:100 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background:'transparent',border:'none',color:'#94a3b8',fontFamily:'monospace',fontSize:12,cursor:'pointer',letterSpacing:'0.06em' }}>
            ← DASHBOARD
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const }}>Vestr</span>
          </div>
          <div style={{ fontSize:10,color:'#94a3b8',fontFamily:'monospace' }}>ESC TO CLOSE</div>
        </nav>

        <div style={{ maxWidth:700,margin:'0 auto',padding:'48px 32px',animation:'fadeUp 0.3s ease both' }}>

          {/* Header */}
          <div style={{ marginBottom:28,textAlign:'center' as const }}>
            <div style={{ fontSize:10,color:'rgba(148,163,184,0.8)',fontFamily:'monospace',letterSpacing:'0.12em',marginBottom:10 }}>
              SEC. SEARCH // STOCK LOOKUP
            </div>
            <h1 style={{ fontSize:28,fontWeight:800,letterSpacing:'-0.5px',color:'#f8fafc',margin:0,marginBottom:6 }}>Find a Stock</h1>
            <div style={{ fontSize:12,color:'#94a3b8',fontFamily:'monospace' }}>
              Search by ticker (AAPL) or company name (Apple)
            </div>
          </div>

          {/* Search box */}
          <div style={{ position:'relative',marginBottom: hasMatch ? 8 : 24 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') goTo(query) }}
              placeholder="e.g. AAPL or Apple..."
              style={{
                width:'100%',boxSizing:'border-box' as const,
                background:'#0a1628',border:'1px solid rgba(99,102,241,0.35)',
                borderRadius:4,padding:'16px 60px 16px 18px',
                fontSize:18,color:'#f8fafc',fontFamily:'monospace',
                outline:'none',letterSpacing:'0.04em',
                boxShadow:'0 0 0 3px rgba(99,102,241,0.08)',
              }}
            />
            <button onClick={() => goTo(query)} style={{
              position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
              background:'#6366f1',border:'none',borderRadius:3,
              padding:'8px 14px',cursor:'pointer',color:'#fff',
              fontSize:12,fontFamily:'monospace',fontWeight:700,
            }}>GO →</button>
          </div>

          {/* Company match */}
          {hasMatch && match && (
            <div style={{ marginBottom:20 }}>
              <button onClick={() => goTo(query)} style={{
                width:'100%',background:'rgba(99,102,241,0.08)',
                border:'1px solid rgba(99,102,241,0.3)',borderRadius:3,
                padding:'12px 16px',cursor:'pointer',textAlign:'left' as const,
                display:'flex',alignItems:'center',justifyContent:'space-between',
                transition:'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.08)'}
              >
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:9,color:'#6366f1',fontFamily:'monospace',letterSpacing:'0.08em' }}>🏢 COMPANY MATCH</span>
                  <span style={{ fontSize:13,color:'#e2e8f0',fontFamily:'monospace' }}>{match.name}</span>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <span style={{ fontSize:16,fontWeight:800,color:'#f8fafc',fontFamily:'monospace' }}>{match.ticker}</span>
                  <span style={{ fontSize:10,color:'#6366f1',fontFamily:'monospace' }}>→</span>
                </div>
              </button>
            </div>
          )}

          {/* Recent searches */}
          {recent.length > 0 && (
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#6366f1 0%,transparent 60%)' }} />
              <div style={{ padding:'12px 16px',borderBottom:'1px solid rgba(59,130,246,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <div style={{ fontSize:9,color:'rgba(148,163,184,0.8)',fontFamily:'monospace',letterSpacing:'0.1em' }}>RECENT SEARCHES</div>
                <button onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY) }} style={{ fontSize:9,color:'#64748b',fontFamily:'monospace',background:'transparent',border:'none',cursor:'pointer' }}>CLEAR</button>
              </div>
              <div style={{ display:'flex',flexWrap:'wrap' as const,gap:6,padding:'12px 16px' }}>
                {recent.map(r => (
                  <button key={r} onClick={() => goTo(r)} style={{
                    background:'#060d1f',border:'1px solid rgba(59,130,246,0.12)',
                    borderRadius:3,padding:'6px 12px',cursor:'pointer',
                    display:'flex',alignItems:'center',gap:8,
                    transition:'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(99,102,241,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='rgba(59,130,246,0.12)'}
                  >
                    <span style={{ fontSize:13,fontWeight:700,fontFamily:'monospace',color:'#f1f5f9' }}>{r}</span>
                    {COMPANY_DISPLAY[r] && (
                      <span style={{ fontSize:10,color:'#94a3b8',fontFamily:'monospace' }}>{COMPANY_DISPLAY[r]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular stocks */}
          <div style={{ ...card }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#6366f1 0%,transparent 60%)' }} />
            <div style={{ padding:'12px 16px',borderBottom:'1px solid rgba(59,130,246,0.07)' }}>
              <div style={{ fontSize:9,color:'rgba(148,163,184,0.8)',fontFamily:'monospace',letterSpacing:'0.1em' }}>POPULAR STOCKS</div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)' }}>
              {POPULAR.map((ticker, i) => (
                <button key={ticker} onClick={() => goTo(ticker)} style={{
                  background:'transparent',border:'none',
                  borderRight:(i+1)%5!==0?'1px solid rgba(59,130,246,0.06)':'none',
                  borderBottom:i<5?'1px solid rgba(59,130,246,0.06)':'none',
                  padding:'16px 10px',cursor:'pointer',
                  display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4,
                  transition:'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <span style={{ fontSize:14,fontWeight:800,fontFamily:'monospace',color:'#f1f5f9' }}>{ticker}</span>
                  <span style={{ fontSize:9,color:'#94a3b8',fontFamily:'monospace',textAlign:'center' as const }}>{COMPANY_DISPLAY[ticker]||''}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop:14,textAlign:'center' as const,fontSize:10,color:'#64748b',fontFamily:'monospace' }}>
            PRESS ESC TO RETURN TO DASHBOARD
          </div>
        </div>
      </div>
    </>
  )
}