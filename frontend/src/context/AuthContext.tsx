import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import { authService, saveAuth, clearAuth, getStoredUser } from '../services/api'

interface AuthContextType {
  user        : User | null
  isLoggedIn  : boolean
  isLoading   : boolean
  login       : (email: string, password: string) => Promise<void>
  register    : (email: string, username: string, password: string) => Promise<void>
  logout      : () => void
  updateUser  : (user: User) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
      saveAuth(data.access_token, data.user)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string) => {
    setIsLoading(true)
    try {
      const data = await authService.register(email, username, password)
      saveAuth(data.access_token, data.user)
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
      isLoggedIn : !!user,
      isLoading,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}