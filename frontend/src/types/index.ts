// ── Auth types ────────────────────────────────────────────────

export interface User {
  id         : number
  email      : string
  username   : string
  mode       : "rookie" | "pro"
  theme      : "dark" | "light" | "system"
  layout     : "classic" | "trader" | "minimal"
  created_at : string
}

export interface AuthResponse {
  access_token : string
  token_type   : string
  user         : User
}

// ── Stock types ───────────────────────────────────────────────

export interface Indicators {
  rsi          : number
  macd_line    : number
  signal_line  : number
  sma_10       : number
  sma_50       : number
  bb_upper     : number
  bb_lower     : number
  bb_bandwidth : number
  obv          : number
  close        : number
}

export interface Sentiment {
  label         : string
  score         : number
  bullish_pct   : number
  bearish_pct   : number
  article_count : number
  summary       : string
  headlines     : Headline[]
}

export interface Headline {
  headline     : string
  label        : string
  compound     : number
  source       : string
  published_at : string | null
  url          : string
}

export interface RookieCard {
  verdict             : string
  verdict_explanation : string
  current_price       : string
  risk_level          : string
  risk_explanation    : string
  key_reasons         : string[]
  warnings            : string[]
  entry               : string
}

export interface ProCard {
  verdict    : string
  score      : number
  ml         : {
    confidence : string
    buy_prob   : string
    hold_prob  : string
    sell_prob  : string
  }
  indicators : Indicators
  sentiment  : Sentiment
}

export interface Tip {
  ticker      : string
  verdict     : string
  score       : number
  risk_level  : string
  entry       : { price: number | null; rationale: string }
  rookie_card : RookieCard
  pro_card    : ProCard
  reasoning   : string[]
  user_mode   : string
  error       : string | null
}

export interface PricePoint {
  date   : string
  open   : number
  high   : number
  low    : number
  close  : number
  volume : number
}

export interface StockSummary {
  ticker     : string
  close      : number
  open       : number
  high       : number
  low        : number
  volume     : number
  change     : number
  change_pct : number
  date       : string
}

// ── Backtest types ────────────────────────────────────────────

export interface Trade {
  type       : string
  date       : string
  price      : number
  shares     : number
  value      : number
  profit?    : number
  profit_pct?: number
  confidence : number
  days_held? : number
}

export interface PortfolioPoint {
  date            : string
  portfolio_value : number
  close           : number
  holding         : boolean
}

export interface BacktestResult {
  ticker            : string
  starting_cash     : number
  final_value       : number
  total_return_pct  : number
  buy_hold_return   : number
  total_trades      : number
  winning_trades    : number
  win_rate          : number
  max_drawdown      : number
  sharpe_ratio      : number
  avg_profit_pct    : number
  trades            : Trade[]
  portfolio_history : PortfolioPoint[]
  error             : string | null
}

// ── Watchlist types ───────────────────────────────────────────

export interface WatchlistItem {
  id       : number
  ticker   : string
  name     : string | null
  added_at : string
}

// ── Portfolio types ───────────────────────────────────────────

export interface PortfolioItem {
  id            : number
  ticker        : string
  name          : string | null
  shares        : number
  avg_buy_price : number
  current_price : number | null
  total_cost    : number
  current_value : number | null
  pnl           : number | null
  pnl_pct       : number | null
  added_at      : string
}

export interface PortfolioSummary {
  total_cost          : number
  total_current_value : number
  total_pnl           : number
  total_pnl_pct       : number
  holdings_count      : number
}

// ── Screener types ────────────────────────────────────────────

export interface ScreenerResult {
  ticker     : string
  verdict    : string
  score      : number
  confidence : number
  close      : number
  rsi        : number
  sentiment  : string
  risk_level : string
  entry      : any
  summary    : string
}


export interface ScreenerResponse {
  must_buy       : ScreenerResult[]
  must_sell      : ScreenerResult[]
  scanned        : number
  universe_size  : number
}