import axios from 'axios'

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL : BASE_URL,
  timeout : 180000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('vestr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vestr_token')
      localStorage.removeItem('vestr_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const getStoredUser = () => {
  const u = localStorage.getItem('vestr_user')
  return u ? JSON.parse(u) : null
}
export const saveAuth = (token: string, user: any) => {
  localStorage.setItem('vestr_token', token)
  localStorage.setItem('vestr_user', JSON.stringify(user))
}
export const clearAuth = () => {
  localStorage.removeItem('vestr_token')
  localStorage.removeItem('vestr_user')
}

export const authService = {
  login             : (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  register          : (email: string, username: string, password: string) =>
    api.post('/auth/register', { email, username, password }).then(r => r.data),
  me                : () => api.get('/auth/me').then(r => r.data),
  getMe             : () => api.get('/auth/me').then(r => r.data),
  updatePreferences : (data: { mode?: string; theme?: string }) =>
    api.patch('/auth/preferences', data).then(r => r.data),
}

export const stockService = {
  getSummary  : (ticker: string) =>
    api.get(`/stocks/${ticker}/summary`).then(r => r.data),
  getTip      : (ticker: string) =>
    api.get(`/stocks/${ticker}/tip`).then(r => r.data),
  getBacktest : (ticker: string, startingCash?: number) =>
    api.get(`/stocks/${ticker}/backtest`, { params: { starting_cash: startingCash } }).then(r => r.data),
  getHistory  : (ticker: string, period: string) =>
    api.get(`/stocks/${ticker}/history?period=${period}`).then(r => r.data),
}

export const watchlistService = {
  getAll : ()               => api.get('/watchlist/').then(r => r.data),
  add    : (ticker: string) => api.post('/watchlist/', { ticker }).then(r => r.data),
  remove : (ticker: string) => api.delete(`/watchlist/${ticker}`).then(r => r.data),
}

export const portfolioService = {
  getAll      : ()     => api.get('/portfolio/').then(r => r.data),
  getSummary  : ()     => api.get('/portfolio/summary').then(r => r.data),
  addPosition : (ticker: string, shares: number, avg_buy_price: number) =>
    api.post('/portfolio/', { ticker, shares, avg_buy_price }).then(r => r.data),
  add         : (data: { ticker: string; name?: string; shares: number; avg_buy_price: number }) =>
    api.post('/portfolio/', data).then(r => r.data),
  update      : (ticker: string, data: { ticker: string; shares: number; avg_buy_price: number }) =>
    api.patch(`/portfolio/${ticker}`, data).then(r => r.data),
  remove      : (ticker: string) => api.delete(`/portfolio/${ticker}`).then(r => r.data),
}

export const screenerService = {
  run          : () => api.get('/screener/').then(r => r.data),
  scanWatchlist: () => api.get('/screener/watchlist').then(r => r.data),
}

export const alertsService = {
  getAll : () => api.get('/alerts/').then(r => r.data),
  add    : (ticker: string, target_price: number, direction: string, note?: string) =>
    api.post('/alerts/', { ticker, target_price, direction, note: note || '' }).then(r => r.data),
  remove : (id: number) => api.delete(`/alerts/${id}`).then(r => r.data),
}

export default api