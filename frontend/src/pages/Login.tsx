import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate                = useNavigate()
  const { login, isLoading }    = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [visible, setVisible]   = useState(false)
  const [exiting, setExiting]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const goBack = () => {
    setExiting(true)
    setTimeout(() => navigate('/'), 520)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@') || !email.includes('.')) {
      setError('ERR: INVALID EMAIL FORMAT')
      return
    }
    if (password.length < 8) {
      setError('ERR: PASSWORD MUST BE AT LEAST 8 CHARACTERS')
      return
    }
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('ERR: INVALID CREDENTIALS — CHECK EMAIL AND PASSWORD')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#060d1f',
    border: '1px solid rgba(59,130,246,0.18)',
    borderRadius: 3, padding: '11px 14px',
    fontSize: 13, color: '#e2e8f0',
    fontFamily: 'monospace', outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scan{0%{transform:translateY(-100%);opacity:0}5%{opacity:.3}95%{opacity:.3}100%{transform:translateY(100vh);opacity:0}}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #060d1f inset!important;-webkit-text-fill-color:#e2e8f0!important;border:1px solid rgba(99,102,241,0.3)!important;}
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
        transform: visible && !exiting ? 'scale(1)' : 'scale(0.97)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
      }}>

        <div style={{
          position: 'fixed' as const, top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.25), transparent)',
          animation: 'scan 14s ease-in-out 1s infinite',
          zIndex: 1, pointerEvents: 'none' as const,
        }} />

        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 48px', borderBottom: '1px solid rgba(59,130,246,0.1)',
          background: 'rgba(6,13,31,0.95)', backdropFilter: 'blur(16px)',
          position: 'sticky' as const, top: 0, zIndex: 100,
        }}>
          <button onClick={goBack} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#64748b', fontFamily: 'monospace', fontSize: 12,
            letterSpacing: '0.06em', padding: '4px 0',
          }}>← BACK</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" stroke="#6366f1" strokeWidth="1.5"/>
              <path d="M6 19 L10 13 L14 16 L19 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: "'Space Grotesk', sans-serif" }}>Vestr</span>
          </div>
          <div style={{ width: 60 }} />
        </nav>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 440, animation: visible ? 'fadeUp 0.5s ease 0.1s both' : 'none' }}>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 12 }}>
                SEC. AUTH // SIGN IN
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1.5px', marginBottom: 8, color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif" }}>
                Welcome back.
              </h1>
              <p style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>
                // AUTHENTICATE TO ACCESS YOUR DASHBOARD
              </p>
            </div>

            <div style={{ position: 'relative' as const }}>
              {[
                { top: -6, left: -6, borderTop: '1.5px solid rgba(59,130,246,0.35)', borderLeft: '1.5px solid rgba(59,130,246,0.35)' },
                { top: -6, right: -6, borderTop: '1.5px solid rgba(59,130,246,0.35)', borderRight: '1.5px solid rgba(59,130,246,0.35)' },
                { bottom: -6, left: -6, borderBottom: '1.5px solid rgba(59,130,246,0.35)', borderLeft: '1.5px solid rgba(59,130,246,0.35)' },
                { bottom: -6, right: -6, borderBottom: '1.5px solid rgba(59,130,246,0.35)', borderRight: '1.5px solid rgba(59,130,246,0.35)' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute' as const, width: 16, height: 16, ...s as React.CSSProperties }} />
              ))}

              <div style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 4, padding: 28, position: 'relative' as const }}>
                <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1 0%, transparent 60%)', borderRadius: '4px 4px 0 0' }} />

                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 10, color: 'rgba(59,130,246,0.45)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 8 }}>
                      FIELD_01 // EMAIL ADDRESS
                    </label>
                    <input
                      type="email" value={email} required
                      onChange={e => setEmail(e.target.value)}
                      placeholder="user@domain.com"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.18)'}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 10, color: 'rgba(59,130,246,0.45)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 8 }}>
                      FIELD_02 // PASSWORD
                    </label>
                    <input
                      type="password" value={password} required
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.18)'}
                    />
                  </div>

                  {error && (
                    <div style={{
                      background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 3, padding: '10px 12px', marginBottom: 18,
                      fontSize: 11, color: '#ef4444', fontFamily: 'monospace',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ color: '#ef4444', fontSize: 13 }}>⚑</span>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={isLoading} style={{
                    width: '100%', background: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.6)',
                    color: 'white', fontSize: 13, fontWeight: 600,
                    fontFamily: "'Space Grotesk', monospace", letterSpacing: '0.08em',
                    padding: '13px', borderRadius: 3, cursor: 'pointer',
                    opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.2s',
                    boxShadow: '0 0 24px rgba(99,102,241,0.2)',
                  }}>
                    {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE →'}
                  </button>
                </form>
              </div>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' as const }}>
              <span style={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
                NO ACCOUNT?{' '}
                <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', letterSpacing: '0.06em' }}>
                  REGISTER →
                </Link>
              </span>
            </div>

            <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.07)' }} />
              <span style={{ fontSize: 9, color: '#0f2040', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                AUTH: JWT // EXP: 30D // ENC: BCRYPT
              </span>
              <div style={{ height: 1, flex: 1, background: 'rgba(59,130,246,0.07)' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}