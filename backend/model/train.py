import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler

from backend.data.database import SessionLocal, init_db
from backend.data.fetcher import get_prices, fetch_and_store
from backend.indicators.indicators import compute_all
from backend.news.sentiment import analyse_ticker_sentiment

# Where we save the trained model to disk
MODEL_PATH  = "backend/model/vestr_model.pkl"
SCALER_PATH = "backend/model/vestr_scaler.pkl"

# These are the exact feature columns the model trains on
# Order matters — must be identical at training and prediction time
FEATURE_COLUMNS = [
    "rsi",
    "macd_line",
    "signal_line",
    "histogram",
    "sma_10",
    "sma_50",
    "bb_upper",
    "bb_lower",
    "bb_bandwidth",
    "volume",
    "obv",
    "sma_ratio",        # sma_10 / sma_50 — captures golden/death cross strength
    "bb_position",      # where price sits within the bands (0 = lower, 1 = upper)
    "price_vs_sma50",   # % price is above/below SMA50
]


def create_labels(df: pd.DataFrame, forward_days: int = 5, threshold: float = 0.02) -> pd.Series:
    """
    Creates BUY/SELL/HOLD labels by looking forward N days.

    For each row (trading day), we look at what the price did
    'forward_days' days later and label it:

        Price rose  > threshold  → BUY  (2)
        Price fell  > threshold  → SELL (0)
        Otherwise                → HOLD (1)

    Args:
        df:           price + indicator DataFrame
        forward_days: how many days ahead to look (default 5)
        threshold:    % move required to trigger BUY/SELL (default 2%)

    Returns:
        Series of labels: 0 (SELL), 1 (HOLD), 2 (BUY)
    """
    # Future return = (price N days later - today's price) / today's price
    future_return = df["close"].shift(-forward_days) / df["close"] - 1

    labels = pd.Series(1, index=df.index)            # default → HOLD
    labels[future_return >  threshold] = 2            # BUY
    labels[future_return < -threshold] = 0            # SELL

    return labels


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds derived features that give the model richer signals
    beyond the raw indicator values.

    sma_ratio      → ratio of SMA10 to SMA50.
                     > 1 means short term trend above long term (bullish)
                     < 1 means short term trend below long term (bearish)

    bb_position    → where the current price sits within the Bollinger Bands.
                     0 = at lower band, 1 = at upper band, 0.5 = middle
                     Helps model understand overbought/oversold position precisely

    price_vs_sma50 → % the current price is above or below SMA50.
                     Captures how extended or depressed the price is
                     relative to medium term trend
    """
    df = df.copy()

    df["sma_ratio"]      = df["sma_10"] / df["sma_50"]
    df["bb_position"]    = (df["close"] - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"])
    df["price_vs_sma50"] = (df["close"] - df["sma_50"]) / df["sma_50"]

    return df


def train(tickers: list[str], forward_days: int = 5, threshold: float = 0.02):
    """
    Full training pipeline:
        1. Load price data for all tickers
        2. Compute indicators
        3. Engineer features
        4. Create labels (what did price do N days later?)
        5. Train Random Forest on 80% of data
        6. Evaluate on remaining 20%
        7. Save model + scaler to disk

    Args:
        tickers:      list of stock symbols to train on e.g. ["AAPL", "TSLA"]
        forward_days: how many days ahead to predict
        threshold:    % move required to label as BUY or SELL
    """
    init_db()
    db = SessionLocal()

    all_features = []
    all_labels   = []

    print(f"[Vestr] Training on {len(tickers)} tickers...\n")

    for ticker in tickers:
        print(f"[Vestr] Processing {ticker}...")

        # Fetch data if we don't have it yet
        fetch_and_store(ticker, db, period_years=5)

        # Get prices → compute indicators → engineer features
        prices = get_prices(ticker, db)
        if prices.empty:
            print(f"[Vestr] Skipping {ticker} — no price data.")
            continue

        df = compute_all(prices)
        if len(df) < 100:
            print(f"[Vestr] Skipping {ticker} — not enough data ({len(df)} rows).")
            continue

        df = engineer_features(df)

        # Create labels
        labels = create_labels(df, forward_days=forward_days, threshold=threshold)

        # Align features and labels — drop last N rows since they have no future data
        df     = df.iloc[:-forward_days]
        labels = labels.iloc[:-forward_days]

        # Drop any remaining NaN rows
        valid  = df[FEATURE_COLUMNS].notna().all(axis=1)
        df     = df[valid]
        labels = labels[valid]

        all_features.append(df[FEATURE_COLUMNS])
        all_labels.append(labels)

        print(f"  → {len(df)} training rows | BUY: {(labels==2).sum()} HOLD: {(labels==1).sum()} SELL: {(labels==0).sum()}")

    db.close()

    if not all_features:
        print("[Vestr] No training data collected. Aborting.")
        return

    # Combine all tickers into one training dataset
    X = pd.concat(all_features, axis=0).reset_index(drop=True)
    y = pd.concat(all_labels,   axis=0).reset_index(drop=True)

    print(f"\n[Vestr] Total training samples: {len(X)}")
    print(f"  BUY: {(y==2).sum()} | HOLD: {(y==1).sum()} | SELL: {(y==0).sum()}\n")

    # Train/test split — 80% train, 20% test
    # shuffle=False preserves time order (important for financial data)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        shuffle=False
    )

    # Scale features — Random Forest doesn't strictly need this but it
    # helps with feature importance interpretation and future model swaps
    scaler  = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test  = scaler.transform(X_test)

    # Train the Random Forest
    # n_estimators=200  → 200 decision trees voting
    # max_depth=10      → prevents overfitting (trees can't go too deep)
    # min_samples_leaf=5 → each leaf needs at least 5 samples (smooths noise)
    # class_weight="balanced" → compensates if BUY/SELL/HOLD aren't equal counts
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,        # reproducible results
        n_jobs=-1               # use all CPU cores
    )

    print("[Vestr] Training Random Forest...")
    model.fit(X_train, y_train)

    # Evaluate on unseen test data
    y_pred    = model.predict(X_test)
    accuracy  = accuracy_score(y_test, y_pred)

    print(f"\n[Vestr] Test Accuracy: {accuracy * 100:.2f}%\n")
    print("[Vestr] Classification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=["SELL", "HOLD", "BUY"]
    ))

    # Feature importance — tells us which indicators matter most
    importances = pd.Series(
        model.feature_importances_,
        index=FEATURE_COLUMNS
    ).sort_values(ascending=False)

    print("[Vestr] Feature Importances:")
    for feat, imp in importances.items():
        print(f"  {feat:20s} → {imp:.4f}")

    # Save model and scaler to disk
    os.makedirs("backend/model", exist_ok=True)
    with open(MODEL_PATH,  "wb") as f:
        pickle.dump(model,  f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)

    print(f"\n[Vestr] Model saved to {MODEL_PATH}")
    print(f"[Vestr] Scaler saved to {SCALER_PATH}")


if __name__ == "__main__":
    """
    Trains the model on a diverse set of tickers covering
    different sectors so it learns generalised patterns
    not just Apple-specific behaviour.

    python -m backend.model.train
    """
    TRAINING_TICKERS = [
        # Tech
        "AAPL", "MSFT", "NVDA", "GOOGL", "META",
        # Finance
        "JPM", "BAC", "GS",
        # Consumer
        "AMZN", "TSLA", "WMT",
        # Healthcare
        "JNJ", "PFE",
        # Energy
        "XOM", "CVX",
    ]

    train(
        tickers=TRAINING_TICKERS,
        forward_days=5,
        threshold=0.02
    )