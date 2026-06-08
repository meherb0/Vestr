import React, { useState, useEffect } from 'react'

function getMarketStatus() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())

  const get = (t: string) => parts.find(p => p.type === t)?.value || ''
  const days    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const dayIdx  = days.indexOf(get('weekday'))
  const hour    = parseInt(get('hour'), 10) % 24
  const minute  = parseInt(get('minute'), 10)
  const mins    = hour * 60 + minute
  const isWeekday = dayIdx >= 1 && dayIdx <= 5

  const isOpen = isWeekday && mins >= 570 && mins < 960   // 9:30–16:00 ET

  let nextOpen = 'OPENS 9:30 AM ET'
  if (!isOpen && !(isWeekday && mins < 570)) {
    let d = dayIdx
    do { d = (d + 1) % 7 } while (d === 0 || d === 6)
    nextOpen = `OPENS ${days[d].toUpperCase()} 9:30 AM ET`
  }

  return { isOpen, nextOpen }
}

export default function MarketStatus() {
  const [s, setS] = useState(getMarketStatus())
  useEffect(() => {
    const iv = setInterval(() => setS(getMarketStatus()), 30000)
    return () => clearInterval(iv)
  }, [])

  const color = s.isOpen ? '#22c55e' : '#ef4444'

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:7,
      background: s.isOpen ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
      border: `1px solid ${s.isOpen ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}`,
      borderRadius:2, padding:'4px 10px',
    }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:color }} />
      <span style={{ fontSize:9, fontWeight:700, fontFamily:'monospace', letterSpacing:'0.08em', color }}>
        {s.isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
      </span>
      <span style={{ fontSize:9, color:'#64748b', fontFamily:'monospace', letterSpacing:'0.04em' }}>
        {s.isOpen ? 'CLOSES 4:00 PM ET' : s.nextOpen}
      </span>
    </div>
  )
}