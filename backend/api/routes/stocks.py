from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.data.database import get_db
from backend.data.models import User
from backend.api.schemas import BacktestRequest, MessageResponse
from backend.api.auth import get_current_user_optional
from backend.tips.generator import generate_tip
from backend.backtest.engine import run_backtest
from backend.data.fetcher import get_prices, fetch_and_store

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/{ticker}/tip")
def get_tip(
    ticker       : str,
    current_user : User = Depends(get_current_user_optional),
):
    """
    Main endpoint — generates a full Vestr tip for any stock ticker.

    Returns:
        - verdict (STRONG BUY / BUY / WATCH / SELL / STRONG SELL)
        - risk level
        - entry suggestion
        - rookie card (plain English)
        - pro card (raw data)
        - reasoning points
        - news sentiment
        - all underlying indicator values

    Works for both guests and logged in users.
    Logged in users get mode-aware response (rookie vs pro).
    """
    ticker = ticker.upper().strip()

    if not ticker.isalpha() or len(ticker) > 5:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "Invalid ticker symbol."
        )

    tip = generate_tip(ticker)

    if tip["error"]:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = tip["error"]
        )

    # If logged in, attach user's mode so frontend knows which card to show
    if current_user:
        tip["user_mode"] = current_user.mode
    else:
        tip["user_mode"] = "rookie"  # default for guests

    return tip


@router.get("/{ticker}/backtest")
def get_backtest(
    ticker        : str,
    starting_cash : float = Query(default=10000.0, ge=100, le=10_000_000),
    current_user  : User  = Depends(get_current_user_optional),
):
    """
    Runs a full backtest for a ticker using Vestr's ML signals.

    Query params:
        starting_cash: how much to simulate starting with (default $10,000)

    Returns:
        - total return vs buy and hold
        - win rate, sharpe ratio, max drawdown
        - full trade history
        - portfolio value over time (for chart)
    """
    ticker = ticker.upper().strip()

    if not ticker.isalpha() or len(ticker) > 5:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "Invalid ticker symbol."
        )

    result = run_backtest(ticker, starting_cash=starting_cash)

    if result["error"]:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = result["error"]
        )

    return result


@router.get("/{ticker}/prices")
def get_price_history(
    ticker : str,
    db     : Session = Depends(get_db),
):
    """
    Returns stored historical price data for a ticker.
    Used by the frontend to render the price chart.

    Fetches fresh data if not already stored.
    Returns list of OHLCV rows sorted by date ascending.
    """
    ticker = ticker.upper().strip()

    if not ticker.isalpha() or len(ticker) > 5:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "Invalid ticker symbol."
        )

    # Fetch and store if needed
    fetch_and_store(ticker, db, period_years=5)
    df = get_prices(ticker, db)

    if df.empty:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"No price data found for {ticker}."
        )

    # Convert DataFrame to list of dicts for JSON response
    records = []
    for date, row in df.iterrows():
        records.append({
            "date"   : str(date),
            "open"   : row["open"],
            "high"   : row["high"],
            "low"    : row["low"],
            "close"  : row["close"],
            "volume" : row["volume"],
        })

    return {
        "ticker"  : ticker,
        "count"   : len(records),
        "prices"  : records,
    }


@router.get("/{ticker}/summary")
def get_summary(
    ticker : str,
    db     : Session = Depends(get_db),
):
    """
    Returns a lightweight summary for a ticker —
    just the latest price and basic stats.

    Used by watchlist and portfolio widgets
    where we need current price without running the full tip pipeline.
    """
    ticker = ticker.upper().strip()

    if not ticker.isalpha() or len(ticker) > 5:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "Invalid ticker symbol."
        )

    fetch_and_store(ticker, db, period_years=1)
    df = get_prices(ticker, db)

    if df.empty:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"No price data found for {ticker}."
        )

    latest     = df.iloc[-1]
    prev       = df.iloc[-2] if len(df) > 1 else latest
    change     = latest["close"] - prev["close"]
    change_pct = (change / prev["close"]) * 100

    return {
        "ticker"     : ticker,
        "close"      : round(latest["close"],  2),
        "open"       : round(latest["open"],   2),
        "high"       : round(latest["high"],   2),
        "low"        : round(latest["low"],    2),
        "volume"     : round(latest["volume"], 0),
        "change"     : round(change,           2),
        "change_pct" : round(change_pct,       2),
        "date"       : str(df.index[-1]),
    }