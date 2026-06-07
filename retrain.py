"""
Vestr — Full Model Retraining Script
Run from project root: python retrain.py
Downloads 5yr data for 100 tickers, saves to SQLite,
trains Random Forest, saves model + scaler.
Takes ~20-30 minutes.
"""

import os, sys, time, pickle, warnings
import numpy as np
import pandas as pd
import yfinance as yf
from pathlib import Path
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

warnings.filterwarnings('ignore')

# ── Tickers ────────────────────────────────────────────────────
TICKERS = [
    # Mega cap tech
    "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO",
    # Finance
    "JPM","V","MA","BAC","GS","MS","WFC","AXP","SCHW","C",
    # Healthcare
    "UNH","JNJ","LLY","PFE","ABBV","MRK","TMO","ABT","DHR","BMY",
    # Consumer
    "WMT","HD","MCD","NKE","SBUX","TGT","COST","PG","KO","PEP",
    # Energy
    "XOM","CVX","COP","SLB","EOG",
    # Industrial
    "CAT","DE","UPS","RTX","GE","HON","BA",
    # Tech (non-mega)
    "CRM","ORCL","AMD","INTC","QCOM","TXN","ADI","NOW","INTU",
    "ADBE","CSCO","IBM","AMAT","LRCX","KLAC",
    # Communication
    "NFLX","DIS","CMCSA","T","VZ",
    # Real estate / utilities
    "NEE","DUK","SO","AMT","PLD",
    # Other
    "SPGI","BLK","CB","AON","MMC",
    "ISRG","SYK","EW","BSX","ZTS","GILD","REGN","VRTX","AMGN",
    "UBER","ABNB","COIN","PLTR","SNOW","CRWD","DDOG","NET",
    "SHOP","PYPL","SQ","SNAP","SPOT","F","GM",
]

MODEL_PATH  = Path("backend/model/vestr_model.pkl")
SCALER_PATH = Path("backend/model/vestr_scaler.pkl")
YEARS       = 5

FEATURE_COLS = [
    'rsi','macd_line','signal_line','sma_10','sma_50',
    'bb_upper','bb_lower','bb_bandwidth','obv',
    'close_norm','volume_norm',
]


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df    = df.copy()
    close = df['Close']
    vol   = df['Volume']

    # RSI
    delta    = close.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs       = avg_gain / avg_loss.replace(0, np.nan)
    df['rsi'] = 100 - (100 / (1 + rs))

    # MACD
    ema12              = close.ewm(span=12, adjust=False).mean()
    ema26              = close.ewm(span=26, adjust=False).mean()
    df['macd_line']    = ema12 - ema26
    df['signal_line']  = df['macd_line'].ewm(span=9, adjust=False).mean()

    # SMAs
    df['sma_10'] = close.rolling(10).mean()
    df['sma_50'] = close.rolling(50).mean()

    # Bollinger Bands
    sma_20             = close.rolling(20).mean()
    std_20             = close.rolling(20).std()
    df['bb_upper']     = sma_20 + 2 * std_20
    df['bb_lower']     = sma_20 - 2 * std_20
    df['bb_bandwidth'] = (df['bb_upper'] - df['bb_lower']) / sma_20.replace(0, np.nan)

    # OBV
    df['obv'] = (np.sign(close.diff()) * vol).fillna(0).cumsum()

    # Normalised
    df['close_norm']  = close / close.rolling(50).mean()
    df['volume_norm'] = vol / vol.rolling(20).mean()

    # Label: 10-day forward return
    df['future_ret'] = close.shift(-10) / close - 1
    df['label'] = pd.cut(
        df['future_ret'],
        bins=[-np.inf, -0.02, 0.02, np.inf],
        labels=['SELL', 'HOLD', 'BUY']
    )
    return df


def fetch_ticker(ticker: str):
    try:
        df = yf.Ticker(ticker).history(period=f'{YEARS}y')
        if df.empty or len(df) < 150:
            return None
        df = df[['Open','High','Low','Close','Volume']].copy()
        df.dropna(inplace=True)
        df = compute_indicators(df)
        df.dropna(inplace=True)
        df['ticker'] = ticker
        return df
    except Exception as e:
        print(f"  ✗ {ticker}: {e}")
        return None


def main():
    print("\n" + "="*60)
    print("  VESTR MODEL RETRAINING")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Tickers: {len(TICKERS)}  |  Years: {YEARS}")
    print("="*60 + "\n")

    # Step 1 — Fetch
    print(f"[1/4] Fetching data from yFinance...")
    all_data, failed = [], []

    for i, ticker in enumerate(TICKERS, 1):
        print(f"  [{i:3d}/{len(TICKERS)}] {ticker}...", end=' ', flush=True)
        df = fetch_ticker(ticker)
        if df is not None:
            all_data.append(df)
            print(f"✓  ({len(df)} rows)")
        else:
            failed.append(ticker)
            print("✗  skipped")
        time.sleep(0.25)

    if not all_data:
        print("\n✗ No data fetched. Check internet connection.")
        sys.exit(1)

    print(f"\n  ✓ {len(all_data)} tickers fetched  ({len(failed)} failed)")
    if failed:
        print(f"  Skipped: {', '.join(failed)}")

    # Step 2 — Save to SQLite
    print("\n[2/4] Saving to SQLite...")
    try:
        from backend.data.database import SessionLocal, init_db
        from backend.data.models import StockPrice

        init_db()
        db   = SessionLocal()
        saved = 0

        for df in all_data:
            ticker = df['ticker'].iloc[0]
            db.query(StockPrice).filter(StockPrice.ticker == ticker).delete()
            for idx, row in df.iterrows():
                db.add(StockPrice(
                    ticker = ticker,
                    date   = idx.date() if hasattr(idx, 'date') else idx,
                    open   = round(float(row['Open']),  4),
                    high   = round(float(row['High']),  4),
                    low    = round(float(row['Low']),   4),
                    close  = round(float(row['Close']), 4),
                    volume = int(row['Volume']),
                ))
                saved += 1
            if saved % 10000 == 0:
                db.commit()
                print(f"  {saved:,} records saved...")

        db.commit()
        db.close()
        print(f"  ✓ {saved:,} records saved to SQLite")
    except Exception as e:
        print(f"  ✗ SQLite save failed: {e} (continuing without it)")

    # Step 3 — Build dataset
    print("\n[3/4] Building training dataset...")
    combined = pd.concat(all_data, ignore_index=True)
    combined.dropna(subset=FEATURE_COLS + ['label'], inplace=True)

    X = combined[FEATURE_COLS].values.astype(np.float32)
    y = combined['label'].values

    print(f"  Samples : {len(X):,}")
    print(f"  BUY={sum(y=='BUY'):,}  HOLD={sum(y=='HOLD'):,}  SELL={sum(y=='SELL'):,}")

    # Step 4 — Train
    print("\n[4/4] Training Random Forest (this takes a few minutes)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler  = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test  = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators     = 300,
        max_depth        = 12,
        min_samples_leaf = 20,
        class_weight     = 'balanced',
        random_state     = 42,
        n_jobs           = -1,
    )
    model.fit(X_train, y_train)

    acc = model.score(X_test, y_test)
    print(f"\n  Accuracy : {acc:.3f}")
    print(classification_report(y_test, model.predict(X_test)))

    # Save
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    with open(SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)

    print(f"  ✓ Model  → {MODEL_PATH}")
    print(f"  ✓ Scaler → {SCALER_PATH}")
    print("\n" + "="*60)
    print("  DONE — restart backend to use new model")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()