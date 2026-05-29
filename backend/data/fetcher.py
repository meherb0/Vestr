import yfinance as yf
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.data.database import engine, init_db
from backend.data.models import StockPrice, Base

def fetch_and_store(ticker: str, db: Session, period_years: int = 5):
    """
    Pulls historical price data for a ticker from yFinance
    and stores it in our database. Skips dates we already have
    so we never store duplicates.

    Args:
        ticker: stock symbol e.g. "AAPL"
        db: database session
        period_years: how many years of history to pull (default 5)
    """

    ticker = ticker.upper().strip()
    print(f"[Vestr] Fetching data for {ticker}...")

    # Calculate date range
    end_date   = datetime.today()
    start_date = end_date - timedelta(days=365 * period_years)

    # Pull data from yFinance
    raw = yf.download(
        ticker,
        start=start_date.strftime("%Y-%m-%d"),
        end=end_date.strftime("%Y-%m-%d"),
        progress=False,  # suppresses the yfinance download bar
        auto_adjust=True # adjusts for stock splits and dividends automatically
    )

    # yFinance returns empty DataFrame if ticker doesn't exist
    if raw.empty:
        print(f"[Vestr] No data found for {ticker}. Check the ticker symbol.")
        return 0

    # Flatten multi-level column headers yfinance sometimes returns
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)

    # Find out which dates we already have stored for this ticker
    # so we don't insert duplicates
    existing_dates = set(
        row.date for row in
        db.query(StockPrice.date)
          .filter(StockPrice.ticker == ticker)
          .all()
    )

    # Build list of new rows to insert
    new_rows = []
    for date, row in raw.iterrows():
        date_obj = date.date()  # convert pandas Timestamp → Python date

        if date_obj in existing_dates:
            continue  # skip dates we already have

        new_rows.append(StockPrice(
            ticker = ticker,
            date   = date_obj,
            open   = round(float(row["Open"]),   4),
            high   = round(float(row["High"]),   4),
            low    = round(float(row["Low"]),    4),
            close  = round(float(row["Close"]),  4),
            volume = round(float(row["Volume"]), 4),
        ))

    if not new_rows:
        print(f"[Vestr] {ticker} is already up to date. No new rows.")
        return 0

    # Bulk insert all new rows in one database call (much faster than one by one)
    db.bulk_save_objects(new_rows)
    db.commit()

    print(f"[Vestr] Stored {len(new_rows)} new rows for {ticker}.")
    return len(new_rows)


def get_prices(ticker: str, db: Session) -> pd.DataFrame:
    """
    Retrieves all stored price data for a ticker from the database
    and returns it as a clean pandas DataFrame sorted by date.

    Args:
        ticker: stock symbol e.g. "AAPL"
        db: database session

    Returns:
        DataFrame with columns: date, open, high, low, close, volume
    """
    ticker = ticker.upper().strip()

    rows = (
        db.query(StockPrice)
          .filter(StockPrice.ticker == ticker)
          .order_by(StockPrice.date.asc())
          .all()
    )

    if not rows:
        return pd.DataFrame()  # empty DataFrame if nothing stored yet

    # Convert list of database objects → pandas DataFrame
    data = [{
        "date"  : r.date,
        "open"  : r.open,
        "high"  : r.high,
        "low"   : r.low,
        "close" : r.close,
        "volume": r.volume,
    } for r in rows]

    df = pd.DataFrame(data)
    df.set_index("date", inplace=True)
    return df


if __name__ == "__main__":
    """
    Quick test — run this file directly to see if everything works
    python -m backend.data.fetcher
    """
    from backend.data.database import SessionLocal

    init_db()  # create tables if they don't exist

    db = SessionLocal()
    try:
        fetch_and_store("AAPL", db, period_years=5)
        df = get_prices("AAPL", db)
        print(f"\n[Vestr] Retrieved {len(df)} rows for AAPL")
        print(df.tail(5))  # print last 5 rows as a sanity check
    finally:
        db.close()