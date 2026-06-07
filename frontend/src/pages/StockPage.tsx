import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { stockService, watchlistService, portfolioService } from '../services/api'

const VERDICT_COLORS: Record<string, string> = {
  'STRONG BUY': '#22c55e',
  'BUY':        '#86efac',
  'WATCH':      '#eab308',
  'SELL':       '#ef4444',
  'STRONG SELL':'#ef4444',
}

type Tab    = 'overview' | 'indicators' | 'news' | 'backtest'
type Period = '1d' | '1w' | '1mo' | '1y'

const PERIOD_LABELS: Record<Period, string> = {
  '1d':'1D', '1w':'1W', '1mo':'1M', '1y':'1Y',
}

export default function StockPage() {
  const { ticker }   = useParams<{ ticker: string }>()
  const navigate     = useNavigate()
  const { user }     = useAuth()

  const [analysis, setAnalysis]         = useState<any>(null)
  const [backtest, setBacktest]         = useState<any>(null)
  const [backtestLoading, setBacktestLoading] = useState(true)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [tab, setTab]                   = useState<Tab>('overview')
  const [period, setPeriod]             = useState<Period>('1mo')
  const [chartData, setChartData]       = useState<any[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [livePrice, setLivePrice]       = useState(0)
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null)
  const [inWatchlist, setInWatchlist]   = useState(false)
  const [watchlistId, setWatchlistId]   = useState<number | null>(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [showPortfolioForm, setShowPortfolioForm] = useState(false)
  const [shares, setShares]         = useState('')
  const [buyPrice, setBuyPrice]     = useState('')
  const [portfolioMsg, setPortfolioMsg] = useState('')

  // Initial load
  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setError('')
    setBacktestLoading(true)

    stockService.getTip(ticker)
      .then((data: any) => {
        setAnalysis(data)
        const p = data?.prediction?.indicators?.close || 0
        setLivePrice(p)
        setLastUpdated(new Date())
      })
      .catch(() => setError(`ERR: COULD NOT LOAD DATA FOR ${ticker}`))
      .finally(() => setLoading(false))

    stockService.getBacktest(ticker)
      .then(setBacktest)
      .catch(() => setBacktest(null))
      .finally(() => setBacktestLoading(false))

    watchlistService.getAll()
      .then((items: any[]) => {
        const found = items.find(i => i.ticker === ticker)
        if (found) { setInWatchlist(true); setWatchlistId(found.id) }
      }).catch(() => {})
  }, [ticker])

  // Chart data
  useEffect(() => {
    if (!ticker) return
    setChartLoading(true)
    setChartData([])
    stockService.getHistory(ticker, period)
      .then((data: any) => setChartData(data.data || []))
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false))
  }, [ticker, period])

  // 30s live price polling
  useEffect(() => {
    if (!ticker) return
    const poll = () => {
      stockService.getTip(ticker)
        .then((data: any) => {
          const newPrice = data?.prediction?.indicators?.close || 0
          setLivePrice(newPrice)
          setLastUpdated(new Date())
          if (period === '1d') {
            stockService.getHistory(ticker, '1d')
              .then((d: any) => setChartData(d.data || []))
              .catch(() => {})
          }
        }).catch(() => {})
    }
    const iv = setInterval(poll, 30000)
    return () => clearInterval(iv)
  }, [ticker, period])

  const toggleWatchlist = useCallback(async () => {
    setWatchlistLoading(true)
    try {
      if (inWatchlist) {
        await watchlistService.remove(ticker!)
        setInWatchlist(false); setWatchlistId(null)
      } else {
        const item = await watchlistService.add(ticker!)
        setInWatchlist(true); setWatchlistId(item.id)
      }
    } catch {} finally { setWatchlistLoading(false) }
  }, [inWatchlist, watchlistId, ticker])

  const handleAddPortfolio = async () => {
    if (!shares || !buyPrice) return
    try {
      await portfolioService.addPosition(ticker!, parseFloat(shares), parseFloat(buyPrice))
      setPortfolioMsg('POSITION ADDED ✓')
      setTimeout(() => { setShowPortfolioForm(false); setPortfolioMsg(''); setShares(''); setBuyPrice('') }, 1500)
    } catch { setPortfolioMsg('ERR: FAILED TO ADD POSITION') }
  }

  // Rookie translation
  const rt = (term: string) => {
    if (!isRookie) return term
    const map: Record<string, string> = {
      'BULL':'Going Up ↑','BEAR':'Going Down ↓','NEUTRAL':'No Clear Direction →',
      'OVERBOUGHT':'May Be Overpriced ⚠','OVERSOLD':'May Be Undervalued 💡',
      'POSITIVE':'Good News','NEGATIVE':'Bad News',
      'HIGH':'High Risk','MEDIUM':'Medium Risk','LOW':'Low Risk',
    }
    return map[term.toUpperCase()] || term
  }

  const getHeadlineMeaning = (h: any): string => {
    if (h.label === 'Bullish') return isRookie
      ? 'This is positive news. It could push the stock price higher.'
      : `Positive signal (compound: +${h.compound?.toFixed(2) || '0.00'}). Bullish sentiment detected.`
    if (h.label === 'Bearish') return isRookie
      ? 'This is negative news. It may push the stock price lower.'
      : `Negative signal (compound: ${h.compound?.toFixed(2) || '0.00'}). Bearish sentiment detected.`
    return isRookie
      ? "This news doesn't strongly push the stock price either way."
      : `Neutral signal (compound: ${h.compound?.toFixed(2) || '0.00'}). No strong directional bias.`
  }

  const getOverallNewsImpact = (): string => {
    if (bullishPct > 55) return isRookie
      ? `Most recent news about ${ticker} is positive (${bullishPct.toFixed(0)}% good news). This supports a potential price increase.`
      : `Sentiment skewed bullish (${bullishPct.toFixed(0)}% positive vs ${bearishPct.toFixed(0)}% negative). News adds upward pressure.`
    if (bearishPct > 55) return isRookie
      ? `Most recent news about ${ticker} is negative (${bearishPct.toFixed(0)}% bad news). This adds risk to any buy position.`
      : `Sentiment skewed bearish (${bearishPct.toFixed(0)}% negative vs ${bullishPct.toFixed(0)}% positive). News adds downward pressure.`
    return isRookie
      ? `News about ${ticker} is mixed right now. Not enough to strongly push the price up or down on its own.`
      : `Mixed sentiment (${bullishPct.toFixed(0)}% bull / ${bearishPct.toFixed(0)}% bear). News is a neutral factor.`
  }

  // Derived fields
  const indicators    = analysis?.prediction?.indicators || {}
  const sentiment     = analysis?.prediction?.sentiment  || {}
  const verdict       = analysis?.verdict      || 'WATCH'
  const verdictColor  = VERDICT_COLORS[verdict] || '#eab308'
  const confidence    = analysis?.prediction?.confidence || 0
  const entryPrice    = analysis?.entry?.price
  const riskLevel     = analysis?.risk_level   || '—'
  const rsi           = indicators.rsi         || 0
  const macdLine      = indicators.macd_line   || 0
  const signalLine    = indicators.signal_line || 0
  const macdSignal    = macdLine > signalLine ? 'BULL' : 'BEAR'
  const sma10         = indicators.sma_10      || 0
  const sma50         = indicators.sma_50      || 0
  const bbUpper       = indicators.bb_upper    || 0
  const bbLower       = indicators.bb_lower    || 0
  const obv           = indicators.obv         || 0
  const bullishPct    = sentiment.bullish_pct  || 0
  const bearishPct    = sentiment.bearish_pct  || 0
  const newsScore     = sentiment.score        || 0
  const newsSummary   = sentiment.summary      || ''
  const headlines     = sentiment.headlines    || []
  const rookieExpl    = analysis?.rookie_card?.verdict_explanation || ''
  const rookieReasons = (analysis?.rookie_card?.key_reasons || []) as string[]
  const rookieWarning = (analysis?.rookie_card?.warnings || [])[0] || ''
  const proReasoning  = (analysis?.prediction?.reasoning || []) as string[]
  const notes         = (analysis?.notes || []) as [string, string][]
  const isRookie      = user?.mode !== 'pro'

  const card: React.CSSProperties = {
    background:'#0a1628', border:'1px solid rgba(59,130,246,0.14)',
    borderRadius:4, position:'relative', overflow:'hidden',
  }
  const inputStyle: React.CSSProperties = {
    width:'100%', boxSizing:'border-box' as const,
    background:'#060d1f', border:'1px solid rgba(59,130,246,0.2)',
    borderRadius:3, padding:'9px 12px',
    fontSize:12, color:'#e2e8f0', fontFamily:'monospace', outline:'none',
  }

  return (
    <>
      <style>{`
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.2}95%{opacity:.2}100%{transform:translateY(100vh);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes crosshair{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#040b18} ::-webkit-scrollbar-thumb{background:#1e3050;border-radius:2px}
      `}</style>

      <div style={{
        minHeight:'100vh', background:'#060d1f',
        backgroundImage:`
          linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),
          linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px),
          linear-gradient(rgba(59,130,246,0.015) 1px,transparent 1px),
          linear-gradient(90deg,rgba(59,130,246,0.015) 1px,transparent 1px)
        `,
        backgroundSize:'80px 80px,80px 80px,20px 20px,20px 20px',
        fontFamily:"'Space Grotesk',system-ui,sans-serif", color:'#e2e8f0',
      }}>

        <div style={{ position:'fixed',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(59,130,246,0.2),transparent)',animation:'scan 16s ease-in-out infinite',zIndex:1,pointerEvents:'none' }} />

        {/* Nav */}
        <nav style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 32px',borderBottom:'1px solid rgba(59,130,246,0.1)',background:'rgba(6,13,31,0.97)',backdropFilter:'blur(20px)',position:'sticky',top:0,zIndex:100 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background:'transparent',border:'none',color:'#64748b',fontFamily:'monospace',fontSize:12,cursor:'pointer',letterSpacing:'0.06em' }}>← DASHBOARD</button>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const }}>Vestr</span>
          </div>
          <button onClick={() => navigate('/search')} style={{ background:'#0a1628',border:'1px solid rgba(59,130,246,0.2)',borderRadius:3,padding:'6px 14px',cursor:'pointer',color:'#94a3b8',fontFamily:'monospace',fontSize:11 }}>SEARCH →</button>
        </nav>

        <div style={{ maxWidth:1320,margin:'0 auto',padding:'28px 32px' }}>

          {loading && (
            <div style={{ display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16 }}>
              <div style={{ width:24,height:24,border:'2px solid rgba(59,130,246,0.15)',borderTop:'2px solid #6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
              <div style={{ fontSize:11,color:'rgba(59,130,246,0.4)',fontFamily:'monospace',letterSpacing:'0.1em' }}>LOADING {ticker}...</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ marginTop:40,textAlign:'center' as const }}>
              <div style={{ fontSize:12,color:'#ef4444',fontFamily:'monospace',marginBottom:16 }}>{error}</div>
              <button onClick={() => navigate('/search')} style={{ fontSize:11,color:'#6366f1',fontFamily:'monospace',background:'transparent',border:'1px solid rgba(99,102,241,0.3)',padding:'8px 16px',borderRadius:2,cursor:'pointer' }}>← BACK TO SEARCH</button>
            </div>
          )}

          {!loading && !error && analysis && (
            <div style={{ animation:'fadeUp 0.5s ease both' }}>

              {/* Header */}
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,paddingBottom:24,borderBottom:'1px solid rgba(59,130,246,0.08)' }}>
                <div>
                  <div style={{ fontSize:10,color:'rgba(59,130,246,0.45)',fontFamily:'monospace',letterSpacing:'0.12em',marginBottom:8 }}>SEC. ANALYSIS // {ticker}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:4 }}>
                    <h1 style={{ fontSize:36,fontWeight:800,letterSpacing:'-1px',color:'#f8fafc',margin:0 }}>{ticker}</h1>
                    <span style={{ fontSize:10,color:'#6366f1',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',padding:'3px 8px',borderRadius:2,fontFamily:'monospace' }}>NASDAQ</span>
                    <span style={{ fontSize:10,color:isRookie?'#22c55e':'#6366f1',background:isRookie?'rgba(34,197,94,0.08)':'rgba(99,102,241,0.08)',border:`1px solid ${isRookie?'rgba(34,197,94,0.2)':'rgba(99,102,241,0.2)'}`,padding:'3px 8px',borderRadius:2,fontFamily:'monospace' }}>
                      {isRookie?'ROOKIE':'PRO'} MODE
                    </span>
                  </div>
                  <div style={{ fontSize:12,color:'#475569',fontFamily:'monospace' }}>{ticker} // UPDATES EVERY 30s</div>
                </div>
                <div style={{ textAlign:'right' as const }}>
                  <div style={{ fontSize:40,fontWeight:800,fontFamily:'monospace',letterSpacing:'-1.5px',color:'#f8fafc' }}>
                    ${livePrice.toFixed(2)}
                  </div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,marginTop:4 }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e' }} />
                    <span style={{ fontSize:10,color:'#22c55e',fontFamily:'monospace',letterSpacing:'0.06em' }}>LIVE</span>
                    {lastUpdated && (
                      <span style={{ fontSize:9,color:'#334155',fontFamily:'monospace' }}>
                        {lastUpdated.toLocaleTimeString('en-US',{hour12:false})}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 380px',gap:16,alignItems:'start' }}>

                {/* LEFT */}
                <div style={{ display:'flex',flexDirection:'column' as const,gap:14 }}>

                  {/* Chart */}
                  <div style={{ ...card,padding:20 }}>
                    <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#6366f1 0%,transparent 60%)' }} />
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
                      <div style={{ fontSize:9,color:'rgba(99,102,241,0.6)',fontFamily:'monospace',letterSpacing:'0.1em' }}>
                        PRICE HISTORY // {PERIOD_LABELS[period]}
                        {chartLoading && <span style={{ color:'rgba(59,130,246,0.4)',marginLeft:8 }}>LOADING...</span>}
                      </div>
                      <div style={{ display:'flex',gap:4 }}>
                        {(['1d','1w','1mo','1y'] as Period[]).map(p => (
                          <button key={p} onClick={() => setPeriod(p)} style={{
                            fontSize:10,fontFamily:'monospace',padding:'4px 10px',borderRadius:2,cursor:'pointer',
                            background:period===p?'#6366f1':'rgba(59,130,246,0.06)',
                            border:period===p?'1px solid rgba(99,102,241,0.6)':'1px solid rgba(59,130,246,0.15)',
                            color:period===p?'white':'#64748b',transition:'all 0.15s',
                          }}>{PERIOD_LABELS[p]}</button>
                        ))}
                      </div>
                    </div>

                    {chartLoading ? (
                      <div style={{ height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(99,102,241,0.4)',fontFamily:'monospace',fontSize:11 }}>
                        LOADING CHART...
                      </div>
                    ) : chartData.length === 0 ? (
                      <div style={{ height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'#334155',fontFamily:'monospace',fontSize:11 }}>
                        NO CHART DATA AVAILABLE
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData} margin={{ top:5,right:10,left:0,bottom:0 }}>
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.06)" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize:10,fill:'#94a3b8',fontFamily:'monospace' }} tickLine={false} axisLine={{ stroke:'rgba(59,130,246,0.15)' }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize:10,fill:'#94a3b8',fontFamily:'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} domain={['auto','auto']} width={55} />
                          <Tooltip contentStyle={{ background:'#0a1628',border:'1px solid rgba(59,130,246,0.2)',borderRadius:3,fontSize:11,fontFamily:'monospace',color:'#e2e8f0' }} labelStyle={{ color:'#94a3b8',marginBottom:4,fontSize:10 }} formatter={(v: any) => [`$${v}`,'PRICE']} />
                          <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={1.5} fill="url(#chartGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Tabs */}
                  <div style={{ ...card }}>
                    <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#6366f1 0%,transparent 60%)' }} />
                    <div style={{ display:'flex',borderBottom:'1px solid rgba(59,130,246,0.08)' }}>
                      {(['overview','indicators','news','backtest'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                          flex:1,padding:'12px 8px',background:'transparent',border:'none',
                          borderBottom:tab===t?'2px solid #6366f1':'2px solid transparent',
                          color:tab===t?'#e2e8f0':'#475569',
                          fontSize:10,fontFamily:'monospace',letterSpacing:'0.08em',
                          cursor:'pointer',transition:'all 0.2s',textTransform:'uppercase' as const,
                        }}>{t}</button>
                      ))}
                    </div>

                    <div style={{ padding:20 }}>

                      {/* OVERVIEW */}
                      {tab === 'overview' && (
                        <div>
                          <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:14 }}>
                            // {isRookie?'PLAIN ENGLISH SUMMARY':'SIGNAL REASONING'}
                          </div>
                          {isRookie ? (
                            <div>
                              <p style={{ fontSize:13,color:'#94a3b8',lineHeight:1.75,fontFamily:'monospace',marginBottom:16 }}>{rookieExpl}</p>
                              {rookieReasons.length > 0 && (
                                <div style={{ display:'flex',flexDirection:'column' as const,gap:8,marginBottom:20 }}>
                                  {rookieReasons.map((r: string, i: number) => (
                                    <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'10px 12px' }}>
                                      <span style={{ fontSize:9,color:'#6366f1',marginTop:1,flexShrink:0 }}>▸</span>
                                      <span style={{ fontSize:12,color:'#94a3b8',fontFamily:'monospace',lineHeight:1.6 }}>{r}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display:'flex',flexDirection:'column' as const,gap:8,marginBottom:20 }}>
                              {proReasoning.map((r: string, i: number) => {
                                const note = notes[i]
                                const noteColor = note?.[0]==='bullish'?'#4ade80':note?.[0]==='bearish'?'#f87171':'#64748b'
                                return (
                                  <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,background:'#060d1f',border:`1px solid ${noteColor}15`,borderRadius:3,padding:'10px 12px' }}>
                                    <span style={{ fontSize:9,color:noteColor,marginTop:1,flexShrink:0 }}>▸</span>
                                    <span style={{ fontSize:12,color:'#94a3b8',fontFamily:'monospace',lineHeight:1.6 }}>{r}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                            {[
                              { label:'RISK LEVEL',  value:rt(riskLevel.toUpperCase()), color:riskLevel==='High'?'#f87171':riskLevel==='Medium'?'#eab308':'#4ade80' },
                              { label:'ENTRY PRICE', value:entryPrice?`~$${entryPrice}`:'WAIT FOR SIGNAL', color:'#94a3b8' },
                              { label:'CONFIDENCE',  value:`${(confidence*100).toFixed(0)}%`, color:'#818cf8' },
                              { label:'VERDICT',     value:verdict, color:verdictColor },
                            ].map(m => (
                              <div key={m.label} style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'12px 14px' }}>
                                <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:5 }}>{m.label}</div>
                                <div style={{ fontSize:16,fontWeight:700,fontFamily:'monospace',color:m.color }}>{m.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* INDICATORS */}
                      {tab === 'indicators' && (
                        <div>
                          <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:16 }}>// TECHNICAL INDICATOR READINGS</div>
                          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                            {[
                              { label:'RSI (14)',   value:rsi.toFixed(1), note:rt(rsi>70?'OVERBOUGHT':rsi<30?'OVERSOLD':'NEUTRAL'), color:rsi>70?'#f87171':rsi<30?'#4ade80':'#94a3b8' },
                              { label:'MACD',       value:rt(macdSignal), note:`LINE: ${macdLine.toFixed(2)} / SIG: ${signalLine.toFixed(2)}`, color:macdSignal==='BULL'?'#4ade80':'#f87171' },
                              { label:'SMA 10',     value:`$${sma10.toFixed(2)}`, note:isRookie?'10-day avg price':'SHORT TERM', color:'#94a3b8' },
                              { label:'SMA 50',     value:`$${sma50.toFixed(2)}`, note:isRookie?'50-day avg price':'MEDIUM TERM', color:'#94a3b8' },
                              { label:'BB UPPER',   value:`$${bbUpper.toFixed(2)}`, note:isRookie?'Upper price boundary':'RESISTANCE', color:'#f87171' },
                              { label:'BB LOWER',   value:`$${bbLower.toFixed(2)}`, note:isRookie?'Lower price boundary':'SUPPORT', color:'#4ade80' },
                              { label:'OBV',        value:(obv/1e9).toFixed(2)+'B', note:isRookie?'Volume-based trend':'ON-BALANCE VOL', color:'#818cf8' },
                              { label:'NEWS SENT.', value:`${bullishPct.toFixed(0)}% ${isRookie?'Good':'BULL'}`, note:rt(newsScore>0?'POSITIVE':newsScore<0?'NEGATIVE':'NEUTRAL'), color:newsScore>0?'#86efac':newsScore<0?'#f87171':'#94a3b8' },
                            ].map(d => (
                              <div key={d.label} style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'12px 14px' }}>
                                <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.08em',marginBottom:4 }}>{d.label}</div>
                                <div style={{ fontSize:15,fontWeight:700,fontFamily:'monospace',color:d.color,marginBottom:2 }}>{d.value}</div>
                                <div style={{ fontSize:9,color:'#64748b',fontFamily:'monospace' }}>{d.note}</div>
                              </div>
                            ))}
                          </div>
                          {!isRookie && (
                            <div style={{ marginTop:14,padding:'12px 14px',background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3 }}>
                              <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',marginBottom:6 }}>COMPOSITE SIGNAL SCORE</div>
                              <div style={{ height:4,background:'rgba(59,130,246,0.1)',borderRadius:2,overflow:'hidden' }}>
                                <div style={{ height:'100%',width:`${confidence*100}%`,background:`linear-gradient(90deg,#6366f1,${verdictColor})`,borderRadius:2 }} />
                              </div>
                              <div style={{ fontSize:10,color:'#64748b',fontFamily:'monospace',marginTop:4 }}>
                                {(confidence*100).toFixed(1)}% CONFIDENCE IN {verdict}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* NEWS */}
                      {tab === 'news' && (
                        <div>
                          <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:16 }}>// LIVE NEWS SENTIMENT ANALYSIS</div>
                          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16 }}>
                            {[
                              { label:'OVERALL SENTIMENT', value:rt(newsScore>0?'POSITIVE':newsScore<0?'NEGATIVE':'NEUTRAL'), color:newsScore>0?'#4ade80':newsScore<0?'#f87171':'#94a3b8' },
                              { label:isRookie?'GOOD NEWS':'BULLISH HEADLINES', value:`${bullishPct.toFixed(0)}%`, color:'#4ade80' },
                              { label:isRookie?'BAD NEWS':'BEARISH HEADLINES',  value:`${bearishPct.toFixed(0)}%`, color:'#f87171' },
                            ].map(m => (
                              <div key={m.label} style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'12px 14px' }}>
                                <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',marginBottom:5,letterSpacing:'0.06em' }}>{m.label}</div>
                                <div style={{ fontSize:16,fontWeight:700,fontFamily:'monospace',color:m.color }}>{m.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Overall impact */}
                          <div style={{ background:'#060d1f',border:`1px solid ${newsScore>0?'rgba(34,197,94,0.15)':newsScore<0?'rgba(239,68,68,0.15)':'rgba(59,130,246,0.07)'}`,borderRadius:3,padding:'14px',marginBottom:16 }}>
                            <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',marginBottom:8,letterSpacing:'0.08em' }}>
                              {isRookie?'WHAT THIS MEANS FOR THE STOCK':'OVERALL NEWS IMPACT'}
                            </div>
                            <p style={{ fontSize:12,color:'#94a3b8',fontFamily:'monospace',lineHeight:1.65,margin:0 }}>{getOverallNewsImpact()}</p>
                          </div>

                          {/* Headlines or empty state */}
                          {headlines.length === 0 ? (
                            <div style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'24px',textAlign:'center' as const }}>
                              <div style={{ fontSize:12,color:'#475569',fontFamily:'monospace',marginBottom:6 }}>NO RECENT HEADLINES FOUND</div>
                              <div style={{ fontSize:10,color:'#334155',fontFamily:'monospace' }}>
                                {ticker} may not have RSS coverage on Yahoo Finance or Seeking Alpha yet.
                              </div>
                            </div>
                          ) : (
                            <div style={{ display:'flex',flexDirection:'column' as const,gap:10 }}>
                              <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.08em' }}>LATEST HEADLINES</div>
                              {headlines.slice(0,5).map((h: any, i: number) => (
                                <div key={i} style={{ background:'#060d1f',border:`1px solid ${h.label==='Bullish'?'rgba(34,197,94,0.15)':h.label==='Bearish'?'rgba(239,68,68,0.15)':'rgba(59,130,246,0.07)'}`,borderRadius:3,padding:'12px 14px' }}>
                                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                                    <span style={{ fontSize:9,fontFamily:'monospace',fontWeight:700,color:h.label==='Bullish'?'#4ade80':h.label==='Bearish'?'#f87171':'#64748b' }}>
                                      {isRookie ? h.label==='Bullish'?'↑ GOOD NEWS':h.label==='Bearish'?'↓ BAD NEWS':'→ NEUTRAL' : h.label?.toUpperCase()}
                                    </span>
                                    <span style={{ fontSize:9,color:'#334155',fontFamily:'monospace' }}>
                                      {new Date(h.published_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                                    </span>
                                  </div>
                                  <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12,color:'#cbd5e1',fontFamily:'monospace',lineHeight:1.5,textDecoration:'none',display:'block',marginBottom:8 }}>
                                    {h.headline}
                                  </a>
                                  <div style={{ background:'rgba(59,130,246,0.04)',border:'1px solid rgba(59,130,246,0.08)',borderRadius:2,padding:'7px 10px' }}>
                                    <span style={{ fontSize:9,color:'rgba(148,163,184,0.6)',fontFamily:'monospace',letterSpacing:'0.06em' }}>
                                      {isRookie?'WHAT THIS MEANS: ':'SIGNAL: '}
                                    </span>
                                    <span style={{ fontSize:11,color:'#64748b',fontFamily:'monospace' }}>{getHeadlineMeaning(h)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* BACKTEST */}
                      {tab === 'backtest' && (
                        <div>
                          <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:16 }}>
                            // 5-YEAR BACKTEST // 15% STOP-LOSS // 20-DAY COOLDOWN
                          </div>
                          {backtestLoading ? (
                            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                              <div style={{ width:16,height:16,border:'2px solid rgba(59,130,246,0.15)',borderTop:'2px solid #6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
                              <div style={{ fontSize:12,color:'#475569',fontFamily:'monospace' }}>LOADING BACKTEST...</div>
                            </div>
                          ) : !backtest || backtest.error ? (
                            <div style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'24px',textAlign:'center' as const }}>
                              <div style={{ fontSize:12,color:'#475569',fontFamily:'monospace',marginBottom:6 }}>BACKTEST UNAVAILABLE FOR {ticker}</div>
                              <div style={{ fontSize:10,color:'#334155',fontFamily:'monospace' }}>
                                Backtest requires historical data in the database. Run retrain.py to add more tickers.
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14 }}>
                                {[
                                  { label:'STRATEGY RETURN', value:`${(backtest.strategy_return||backtest.total_return||0).toFixed(1)}%`, color:(backtest.strategy_return||0)>=0?'#4ade80':'#f87171' },
                                  { label:'BUY & HOLD',      value:`${(backtest.buyhold_return||backtest.buy_hold_return||0).toFixed(1)}%`, color:'#818cf8' },
                                  { label:'NUM TRADES',      value:String(backtest.num_trades||backtest.total_trades||0), color:'#94a3b8' },
                                  { label:'WIN RATE',        value:`${((backtest.win_rate||0)*100).toFixed(0)}%`, color:'#4ade80' },
                                  { label:'SHARPE RATIO',    value:backtest.sharpe_ratio?.toFixed(3)||'—', color:'#818cf8' },
                                  { label:'MAX DRAWDOWN',    value:`${(backtest.max_drawdown||0).toFixed(1)}%`, color:'#f87171' },
                                ].map(m => (
                                  <div key={m.label} style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'12px 14px' }}>
                                    <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',letterSpacing:'0.06em',marginBottom:5 }}>{m.label}</div>
                                    <div style={{ fontSize:18,fontWeight:700,fontFamily:'monospace',color:m.color }}>{m.value}</div>
                                  </div>
                                ))}
                              </div>
                              {isRookie && (
                                <div style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.08)',borderRadius:3,padding:'14px',marginBottom:14 }}>
                                  <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',marginBottom:8 }}>WHAT THIS MEANS</div>
                                  <p style={{ fontSize:12,color:'#94a3b8',fontFamily:'monospace',lineHeight:1.65,margin:0 }}>
                                    {(backtest.strategy_return||0) > (backtest.buyhold_return||0)
                                      ? `Vestr's strategy would have made ${(backtest.strategy_return||0).toFixed(1)}% over the last 5 years — better than simply holding (${(backtest.buyhold_return||0).toFixed(1)}%).`
                                      : `Simply holding the stock (${(backtest.buyhold_return||0).toFixed(1)}%) would have outperformed the strategy (${(backtest.strategy_return||0).toFixed(1)}%) over 5 years.`
                                    }
                                  </p>
                                </div>
                              )}
                              <div style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:3,padding:'12px 14px' }}>
                                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                                  <span style={{ fontSize:9,color:'#6366f1',fontFamily:'monospace' }}>● STRATEGY</span>
                                  <span style={{ fontSize:9,color:'rgba(59,130,246,0.4)',fontFamily:'monospace' }}>- - B&H</span>
                                </div>
                                <div style={{ height:6,background:'rgba(59,130,246,0.08)',borderRadius:3,overflow:'hidden',position:'relative' as const }}>
                                  <div style={{ position:'absolute',left:0,top:0,bottom:0,width:`${Math.min(Math.abs(backtest.strategy_return||0),100)}%`,background:'linear-gradient(90deg,#6366f1,#22c55e)',borderRadius:3 }} />
                                </div>
                                <div style={{ display:'flex',justifyContent:'space-between',marginTop:6 }}>
                                  <span style={{ fontSize:9,color:'#4ade80',fontFamily:'monospace' }}>STRATEGY: {(backtest.strategy_return||0).toFixed(1)}%</span>
                                  <span style={{ fontSize:9,color:'#818cf8',fontFamily:'monospace' }}>B&H: {(backtest.buyhold_return||0).toFixed(1)}%</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT — verdict */}
                <div style={{ display:'flex',flexDirection:'column' as const,gap:12,position:'sticky' as const,top:80 }}>
                  <div style={{ ...card,padding:22 }}>
                    <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${verdictColor} 0%,transparent 60%)` }} />
                    <div style={{ position:'relative',overflow:'hidden',background:'#060d1f',border:`1px solid ${verdictColor}18`,borderRadius:3,padding:20,marginBottom:14,textAlign:'center' as const }}>
                      <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}>
                        <svg width="120" height="120" style={{ opacity:0.05,animation:'crosshair 30s linear infinite' }}>
                          <line x1="60" y1="0" x2="60" y2="120" stroke={verdictColor} strokeWidth="1"/>
                          <line x1="0" y1="60" x2="120" y2="60" stroke={verdictColor} strokeWidth="1"/>
                          <circle cx="60" cy="60" r="40" stroke={verdictColor} strokeWidth="1" fill="none" strokeDasharray="4 4"/>
                          <circle cx="60" cy="60" r="20" stroke={verdictColor} strokeWidth="1" fill="none"/>
                        </svg>
                      </div>
                      <div style={{ fontSize:9,color:'rgba(59,130,246,0.4)',fontFamily:'monospace',letterSpacing:'0.14em',marginBottom:10 }}>// VESTR VERDICT</div>
                      <div style={{ fontSize:36,fontWeight:900,fontFamily:'monospace',color:verdictColor,letterSpacing:'-0.5px',lineHeight:1 }}>{verdict}</div>
                      <div style={{ marginTop:10,fontSize:11,color:'#475569',fontFamily:'monospace' }}>
                        CONF: <span style={{ color:'#e2e8f0',fontWeight:600 }}>{(confidence*100).toFixed(0)}%</span>
                        <span style={{ margin:'0 8px' }}>|</span>
                        ENTRY: <span style={{ color:'#e2e8f0',fontWeight:600 }}>{entryPrice?`~$${entryPrice}`:'WAIT'}</span>
                      </div>
                    </div>

                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
                      {[
                        { label:'RISK',      value:rt(riskLevel.toUpperCase()), color:riskLevel==='High'?'#f87171':riskLevel==='Medium'?'#eab308':'#4ade80' },
                        { label:'MACD',      value:rt(macdSignal), color:macdSignal==='BULL'?'#4ade80':'#f87171' },
                        { label:'RSI',       value:rsi.toFixed(1), color:rsi>70?'#f87171':rsi<30?'#4ade80':'#94a3b8' },
                        { label:isRookie?'GOOD NEWS %':'SENTIMENT', value:`${bullishPct.toFixed(0)}% ${isRookie?'↑':'BULL'}`, color:'#86efac' },
                      ].map(d => (
                        <div key={d.label} style={{ background:'#060d1f',border:'1px solid rgba(59,130,246,0.07)',borderRadius:2,padding:'8px 10px' }}>
                          <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',marginBottom:3 }}>{d.label}</div>
                          <div style={{ fontSize:13,fontWeight:700,color:d.color,fontFamily:'monospace' }}>{d.value}</div>
                        </div>
                      ))}
                    </div>

                    {isRookie && rookieWarning && (
                      <div style={{ background:'rgba(234,179,8,0.04)',border:'1px solid rgba(234,179,8,0.15)',borderRadius:2,padding:'9px 12px',display:'flex',alignItems:'flex-start',gap:8 }}>
                        <span style={{ fontSize:9,color:'#eab308',flexShrink:0,marginTop:1 }}>⚑</span>
                        <span style={{ fontSize:11,color:'#94a3b8',fontFamily:'monospace',lineHeight:1.5 }}>{rookieWarning}</span>
                      </div>
                    )}
                  </div>

                  <button onClick={toggleWatchlist} disabled={watchlistLoading} style={{
                    width:'100%',padding:'12px',borderRadius:3,cursor:'pointer',
                    background:inWatchlist?'rgba(99,102,241,0.12)':'transparent',
                    border:inWatchlist?'1px solid rgba(99,102,241,0.4)':'1px solid rgba(59,130,246,0.2)',
                    color:inWatchlist?'#818cf8':'#94a3b8',
                    fontSize:12,fontFamily:'monospace',fontWeight:600,letterSpacing:'0.08em',transition:'all 0.2s',
                  }}>
                    {watchlistLoading?'UPDATING...':inWatchlist?'★ IN WATCHLIST':'☆ ADD TO WATCHLIST'}
                  </button>

                  {!showPortfolioForm ? (
                    <button onClick={() => setShowPortfolioForm(true)} style={{
                      width:'100%',padding:'12px',borderRadius:3,cursor:'pointer',
                      background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.25)',
                      color:'#4ade80',fontSize:12,fontFamily:'monospace',fontWeight:600,letterSpacing:'0.08em',
                    }}>+ ADD TO PORTFOLIO</button>
                  ) : (
                    <div style={{ ...card,padding:16 }}>
                      <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#22c55e 0%,transparent 60%)' }} />
                      <div style={{ fontSize:9,color:'rgba(34,197,94,0.5)',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:12 }}>ADD POSITION // {ticker}</div>
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',marginBottom:5 }}>SHARES</div>
                        <input value={shares} onChange={e => setShares(e.target.value)} type="number" placeholder="e.g. 10" style={inputStyle} />
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:9,color:'rgba(148,163,184,0.7)',fontFamily:'monospace',marginBottom:5 }}>AVG BUY PRICE ($)</div>
                        <input value={buyPrice} onChange={e => setBuyPrice(e.target.value)} type="number" placeholder={`e.g. ${livePrice.toFixed(2)}`} style={inputStyle} />
                      </div>
                      {portfolioMsg && (
                        <div style={{ fontSize:10,color:portfolioMsg.includes('ERR')?'#f87171':'#4ade80',fontFamily:'monospace',marginBottom:10 }}>{portfolioMsg}</div>
                      )}
                      <div style={{ display:'flex',gap:8 }}>
                        <button onClick={handleAddPortfolio} style={{ flex:1,padding:'9px',background:'#22c55e',border:'none',color:'#060d1f',fontSize:11,fontFamily:'monospace',fontWeight:700,borderRadius:2,cursor:'pointer' }}>CONFIRM →</button>
                        <button onClick={() => { setShowPortfolioForm(false); setPortfolioMsg('') }} style={{ padding:'9px 12px',background:'transparent',border:'1px solid rgba(59,130,246,0.15)',color:'#64748b',fontSize:11,fontFamily:'monospace',borderRadius:2,cursor:'pointer' }}>✕</button>
                      </div>
                    </div>
                  )}

                  <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
                    <div style={{ height:1,flex:1,background:'rgba(59,130,246,0.06)' }} />
                    <span style={{ fontSize:9,color:'#1e3050',fontFamily:'monospace' }}>VST-{ticker} // {isRookie?'ROOKIE':'PRO'}</span>
                    <div style={{ height:1,flex:1,background:'rgba(59,130,246,0.06)' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}