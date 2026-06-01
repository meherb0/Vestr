from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.data.database import get_db
from backend.data.models import User
from backend.api.auth import get_current_user_optional
from backend.tips.generator import generate_tip
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter(prefix="/api/screener", tags=["screener"])

# Default universe of stocks we scan
# Covers major sectors — expand this list later
SCREENER_UNIVERSE = [
    # Tech
    "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMD", "INTC", "CRM",
    # Finance
    "JPM", "BAC", "GS", "V", "MA",
    # Consumer
    "AMZN", "TSLA", "WMT", "NKE", "MCD",
    # Healthcare
    "JNJ", "PFE", "UNH", "ABBV",
    # Energy
    "XOM", "CVX",
    # Other
    "DIS", "NFLX", "UBER", "SHOP",
]


def _screen_single(ticker: str) -> dict | None:
    """
    Runs a full tip generation on one ticker.
    Returns a simplified result dict or None if it fails.

    We catch all exceptions here so one bad ticker
    doesn't crash the entire screener run.
    """
    try:
        tip = generate_tip(ticker)
        if tip["error"]:
            return None

        return {
            "ticker"     : ticker,
            "verdict"    : tip["verdict"],
            "score"      : tip["score"],
            "confidence" : tip["prediction"]["confidence"],
            "close"      : tip["prediction"]["indicators"].get("close", 0),
            "rsi"        : tip["prediction"]["indicators"].get("rsi", 0),
            "sentiment"  : tip["prediction"]["sentiment"].get("label", "Neutral"),
            "risk_level" : tip["risk_level"],
            "entry"      : tip["entry"],
            "summary"    : tip["rookie_card"].get("verdict_explanation", ""),
        }
    except Exception:
        return None


@router.get("/")
def run_screener(
    current_user : User = Depends(get_current_user_optional),
):
    """
    Scans the entire stock universe and returns:
        must_buy  → top 5 stocks with strongest BUY signals
        must_sell → top 5 stocks with strongest SELL signals

    Uses ThreadPoolExecutor to run tip generation in parallel
    across all tickers — otherwise scanning 30 stocks one by one
    would take several minutes.

    Results are sorted by score:
        must_buy  → highest score first
        must_sell → lowest score first (most negative)
    """
    results = []

    # Run all tickers in parallel — 5 threads at a time
    # More than 5 risks hitting rate limits on RSS feeds
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(_screen_single, ticker): ticker
            for ticker in SCREENER_UNIVERSE
        }

        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                results.append(result)

    if not results:
        raise HTTPException(
            status_code = 503,
            detail      = "Screener failed to fetch data. Try again shortly."
        )

    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)

    # Must buy → positive verdicts, sorted best first
    must_buy = [
        r for r in results
        if r["verdict"] in ("STRONG BUY", "BUY")
    ][:5]

    # Must sell → negative verdicts, sorted worst first
    must_sell = [
        r for r in reversed(results)
        if r["verdict"] in ("STRONG SELL", "SELL")
    ][:5]

    return {
        "must_buy"       : must_buy,
        "must_sell"      : must_sell,
        "scanned"        : len(results),
        "universe_size"  : len(SCREENER_UNIVERSE),
    }


@router.get("/quick/{ticker}")
def quick_screen(
    ticker       : str,
    current_user : User = Depends(get_current_user_optional),
):
    """
    Runs the screener on a single ticker.
    Used when the frontend needs a fast signal
    for a watchlist or portfolio item without
    running the full tip pipeline.
    """
    ticker = ticker.upper().strip()

    if not ticker.isalpha() or len(ticker) > 5:
        raise HTTPException(
            status_code = 400,
            detail      = "Invalid ticker symbol."
        )

    result = _screen_single(ticker)

    if result is None:
        raise HTTPException(
            status_code = 404,
            detail      = f"Could not screen {ticker}."
        )

    return result