import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import { authService, saveAuth, clearAuth, getStoredUser } from '../services/api'

// ── Context shape ─────────────────────────────────────────────
interface AuthContextType {
  user          : User | null
  isLoading     : boolean
  isLoggedIn    : boolean
  login         : (email: string, password: string) => Promise<void>
  register      : (email: string, username: string, password: string) => Promise<void>
  logout        : () => void
  updateUser    : (updated: User) => void
}

// ── Create context ────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null)

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser     ] = useState<User | null>(getStoredUser())
  const [isLoading, setIsLoading] = useState(false)

  // On mount — verify stored token is still valid
  useEffect(() => {
    const stored = getStoredUser()
    if (stored) {
      authService.getMe()
        .then(setUser)
        .catch(() => {
          clearAuth()
          setUser(null)
        })
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const data = await authService.login(email, password)
      saveAuth(data)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string) => {
    setIsLoading(true)
    try {
      const data = await authService.register(email, username, password)
      saveAuth(data)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    clearAuth()
    setUser(null)
  }

  const updateUser = (updated: User) => {
    setUser(updated)
    localStorage.setItem('vestr_user', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isLoggedIn : !!user,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}