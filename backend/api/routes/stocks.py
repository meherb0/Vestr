import time
from fastapi import APIRouter, Depends
from backend.api.auth import get_current_user, get_current_user_optional
from backend.data.models import User

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

# ── In-memory cache ────────────────────────────────────────────
_summary_cache : dict = {}
_summary_time  : dict = {}
_history_cache : dict = {}
_history_time  : dict = {}
SUMMARY_TTL = 60    # 1 minute for price data
HISTORY_TTL = 300   # 5 minutes for chart data


@router.get("/{ticker}/summary")
async def get_summary(
    ticker       : str,
    current_user : User = Depends(get_current_user),
):
    ticker = ticker.upper().strip()
    now    = time.time()

    if ticker in _summary_cache and now - _summary_time.get(ticker, 0) < SUMMARY_TTL:
        return _summary_cache[ticker]

    import yfinance as yf
    try:
        stock = yf.Ticker(ticker)
        hist  = stock.history(period="2d")
        if hist.empty:
            return {"ticker": ticker, "close": 0, "change_pct": 0, "verdict": "WATCH"}

        close      = round(float(hist["Close"].iloc[-1]), 2)
        prev_close = round(float(hist["Close"].iloc[-2]), 2) if len(hist) > 1 else close
        change_pct = round(((close - prev_close) / prev_close) * 100, 2) if prev_close else 0

        result = {
            "ticker"     : ticker,
            "close"      : close,
            "change_pct" : change_pct,
            "verdict"    : "WATCH",
        }
        _summary_cache[ticker] = result
        _summary_time[ticker]  = now
        return result

    except Exception:
        return {"ticker": ticker, "close": 0, "change_pct": 0, "verdict": "WATCH"}


@router.get("/{ticker}/history")
async def get_history(
    ticker       : str,
    period       : str = "1mo",
    current_user : User = Depends(get_current_user),
):
    ticker    = ticker.upper().strip()
    cache_key = f"{ticker}_{period}"
    now       = time.time()

    if cache_key in _history_cache and now - _history_time.get(cache_key, 0) < HISTORY_TTL:
        return _history_cache[cache_key]

    period_map = {
        "1d" : ("1d",  "5m"),
        "1w" : ("5d",  "30m"),
        "1mo": ("1mo", "1d"),
        "1y" : ("1y",  "1d"),
    }
    yf_period, yf_interval = period_map.get(period, ("1mo", "1d"))

    import yfinance as yf
    try:
        stock = yf.Ticker(ticker)
        hist  = stock.history(period=yf_period, interval=yf_interval)
        if hist.empty:
            return {"ticker": ticker, "period": period, "data": []}

        data = []
        for ts, row in hist.iterrows():
            if period == "1d":
                label = ts.strftime("%H:%M")
            elif period == "1w":
                label = ts.strftime("%a %H:%M")
            else:
                label = ts.strftime("%b %d")
            data.append({
                "date"  : label,
                "price" : round(float(row["Close"]), 2),
                "open"  : round(float(row["Open"]),  2),
                "high"  : round(float(row["High"]),  2),
                "low"   : round(float(row["Low"]),   2),
                "volume": int(row["Volume"]),
            })

        result = {"ticker": ticker, "period": period, "data": data}
        _history_cache[cache_key] = result
        _history_time[cache_key]  = now
        return result

    except Exception as e:
        return {"ticker": ticker, "period": period, "data": [], "error": str(e)}


@router.get("/{ticker}/tip")
async def get_tip(
    ticker       : str,
    current_user : User = Depends(get_current_user_optional),
):
    from backend.tips.generator import generate_tip
    ticker = ticker.upper().strip()
    tip    = generate_tip(ticker)
    if current_user:
        tip["user_mode"] = current_user.mode or "rookie"
    return tip


@router.get("/{ticker}/backtest")
async def get_backtest(
    ticker        : str,
    starting_cash : float = 10000.0,
    current_user  : User  = Depends(get_current_user),
):
    from backend.backtest.engine import run_backtest
    ticker = ticker.upper().strip()
    try:
        result = run_backtest(ticker, starting_cash=starting_cash)
        return result
    except Exception as e:
        return {"error": str(e), "ticker": ticker}