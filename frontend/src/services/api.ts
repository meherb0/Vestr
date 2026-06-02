import axios from 'axios'
import { AuthResponse, Tip, BacktestResult, WatchlistItem, PortfolioItem, PortfolioSummary, ScreenerResponse, StockSummary } from '../types'

// ── Base config ───────────────────────────────────────────────
const BASE_URL = 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL : BASE_URL,
  headers : { 'Content-Type': 'application/json' },
})

// ── Auth interceptor ──────────────────────────────────────────
// Automatically attaches JWT token to every request
// so we never have to manually add it in each service call
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vestr_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ──────────────────────────────────────
// If token expires and server returns 401,
// automatically log the user out and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vestr_token')
      localStorage.removeItem('vestr_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)


// ── Auth services ─────────────────────────────────────────────

export const authService = {
  register: async (email: string, username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/register', { email, username, password })
    return res.data
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/login', { email, password })
    return res.data
  },

  getMe: async () => {
    const res = await api.get('/api/auth/me')
    return res.data
  },

  updatePreferences: async (prefs: {
    mode?   : string
    theme?  : string
    layout? : string
  }) => {
    const res = await api.patch('/api/auth/preferences', prefs)
    return res.data
  },

  deleteAccount: async () => {
    const res = await api.delete('/api/auth/account')
    return res.data
  },
}


// ── Stock services ────────────────────────────────────────────

export const stockService = {
  getTip: async (ticker: string): Promise<Tip> => {
    const res = await api.get(`/api/stocks/${ticker}/tip`)
    return res.data
  },

  getBacktest: async (ticker: string, startingCash: number = 10000): Promise<BacktestResult> => {
    const res = await api.get(`/api/stocks/${ticker}/backtest`, {
      params: { starting_cash: startingCash }
    })
    return res.data
  },

  getPrices: async (ticker: string) => {
    const res = await api.get(`/api/stocks/${ticker}/prices`)
    return res.data
  },

  getSummary: async (ticker: string): Promise<StockSummary> => {
    const res = await api.get(`/api/stocks/${ticker}/summary`)
    return res.data
  },
}


// ── Watchlist services ────────────────────────────────────────

export const watchlistService = {
  getAll: async (): Promise<WatchlistItem[]> => {
    const res = await api.get('/api/watchlist/')
    return res.data
  },

  add: async (ticker: string, name?: string): Promise<WatchlistItem> => {
    const res = await api.post('/api/watchlist/', { ticker, name })
    return res.data
  },

  remove: async (ticker: string) => {
    const res = await api.delete(`/api/watchlist/${ticker}`)
    return res.data
  },

  check: async (ticker: string): Promise<{ ticker: string; on_watchlist: boolean }> => {
    const res = await api.get(`/api/watchlist/check/${ticker}`)
    return res.data
  },
}


// ── Portfolio services ────────────────────────────────────────

export const portfolioService = {
  getAll: async (): Promise<PortfolioItem[]> => {
    const res = await api.get('/api/portfolio/')
    return res.data
  },

  getSummary: async (): Promise<PortfolioSummary> => {
    const res = await api.get('/api/portfolio/summary')
    return res.data
  },

  add: async (data: {
    ticker        : string
    name?         : string
    shares        : number
    avg_buy_price : number
  }): Promise<PortfolioItem> => {
    const res = await api.post('/api/portfolio/', data)
    return res.data
  },

  update: async (ticker: string, data: {
    ticker        : string
    shares        : number
    avg_buy_price : number
  }): Promise<PortfolioItem> => {
    const res = await api.patch(`/api/portfolio/${ticker}`, data)
    return res.data
  },

  remove: async (ticker: string) => {
    const res = await api.delete(`/api/portfolio/${ticker}`)
    return res.data
  },
}


// ── Screener services ─────────────────────────────────────────

export const screenerService = {
  run: async (): Promise<ScreenerResponse> => {
    const res = await api.get('/api/screener/')
    return res.data
  },

  quickScreen: async (ticker: string) => {
    const res = await api.get(`/api/screener/quick/${ticker}`)
    return res.data
  },
}


// ── Helpers ───────────────────────────────────────────────────

export const saveAuth = (data: AuthResponse) => {
  localStorage.setItem('vestr_token', data.access_token)
  localStorage.setItem('vestr_user',  JSON.stringify(data.user))
}

export const clearAuth = () => {
  localStorage.removeItem('vestr_token')
  localStorage.removeItem('vestr_user')
}

export const getStoredUser = () => {
  const raw = localStorage.getItem('vestr_user')
  return raw ? JSON.parse(raw) : null
}

export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('vestr_token')
}

export default api