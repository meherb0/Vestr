from fastapi import APIRouter, Depends, HTTPException
from backend.data.models import User
from backend.api.auth import get_current_user, get_current_user_optional
from backend.tips.generator import generate_tip
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter(prefix="/api/screener", tags=["screener"])

SCREENER_UNIVERSE = [
    # Mega cap tech
    "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO","ORCL","ADBE",
    "CRM","NOW","INTU","AMD","INTC","QCOM","TXN","ADI","AMAT","LRCX",
    "KLAC","CSCO","IBM","NFLX","SNAP","SPOT","SHOP","PYPL","COIN","PLTR",
    # Finance
    "JPM","BAC","GS","MS","WFC","C","AXP","SCHW","V","MA",
    "BLK","SPGI","CME","ICE","CB","AON","PGR","TRV","MET","PRU",
    # Healthcare
    "UNH","JNJ","LLY","PFE","ABBV","MRK","TMO","ABT","DHR","BMY",
    "ISRG","SYK","EW","BSX","ZTS","GILD","REGN","VRTX","AMGN","BIIB",
    # Consumer
    "WMT","HD","MCD","NKE","SBUX","TGT","COST","PG","KO","PEP",
    "AMZN","DIS","CMCSA","F","GM","UBER","ABNB","DASH","LYFT","HOOD",
    # Energy
    "XOM","CVX","COP","SLB","EOG","MPC","PSX","VLO","OXY","DVN",
    # Industrial
    "CAT","DE","UPS","RTX","GE","HON","BA","LMT","NOC","MMM",
    "EMR","ETN","PH","ROK","SWK","IR","XYL","AME","FTV","ROP",
    # Real estate / utilities
    "NEE","DUK","SO","AMT","PLD","CCI","EQIX","PSA","EXR","AVB",
    # Communication
    "T","VZ","TMUS","CHTR","NFLX","DIS","PARA","WBD",
    # Materials
    "LIN","APD","ECL","SHW","DD","DOW","NEM","FCX","NUE","VMC",
    # Other notable
    "SNOW","CRWD","DDOG","NET","MDB","ZS","OKTA","TWLO","HUBS","TEAM",
]

def _screen_single(ticker: str) -> dict | None:
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
    current_user: User = Depends(get_current_user_optional),
):
    results = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(_screen_single, ticker): ticker
            for ticker in SCREENER_UNIVERSE
        }
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                results.append(result)

    if not results:
        raise HTTPException(status_code=503, detail="Screener failed. Try again shortly.")

    results.sort(key=lambda x: x["score"], reverse=True)

    must_buy = [r for r in results if r["verdict"] in ("STRONG BUY","BUY")][:5]
    must_sell = [r for r in reversed(results) if r["verdict"] in ("STRONG SELL","SELL")][:5]

    return {
        "must_buy"      : must_buy,
        "must_sell"     : must_sell,
        "scanned"       : len(results),
        "universe_size" : len(SCREENER_UNIVERSE),
    }


@router.get("/watchlist")
def scan_watchlist(
    current_user: User = Depends(get_current_user),
):
    """Scans only the user's watchlist tickers — fast and personalised."""
    from backend.data.database import SessionLocal
    from backend.data.models import WatchlistItem

    db    = SessionLocal()
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id).all()
    db.close()

    if not items:
        return {"must_buy": [], "must_sell": [], "scanned": 0, "universe_size": 0}

    tickers = [i.ticker for i in items]
    results = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(_screen_single, t): t for t in tickers}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                results.append(result)

    results.sort(key=lambda x: x["score"], reverse=True)

    must_buy  = [r for r in results if r["verdict"] in ("STRONG BUY","BUY")]
    must_sell = [r for r in reversed(results) if r["verdict"] in ("STRONG SELL","SELL")]

    return {
        "must_buy"      : must_buy,
        "must_sell"     : must_sell,
        "scanned"       : len(results),
        "universe_size" : len(tickers),
    }


@router.get("/quick/{ticker}")
def quick_screen(
    ticker       : str,
    current_user : User = Depends(get_current_user_optional),
):
    ticker = ticker.upper().strip()
    if not ticker.isalpha() or len(ticker) > 5:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol.")
    result = _screen_single(ticker)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Could not screen {ticker}.")
    return result