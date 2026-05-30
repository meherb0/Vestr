import pickle
import numpy as np
import pandas as pd
from backend.data.database import SessionLocal, init_db
from backend.data.fetcher import get_prices, fetch_and_store
from backend.indicators.indicators import compute_all
from backend.news.sentiment import analyse_ticker_sentiment
from backend.model.train import (
    engineer_features,
    FEATURE_COLUMNS,
    MODEL_PATH,
    SCALER_PATH
)

# Confidence threshold — predictions below this get flagged as uncertain
MIN_CONFIDENCE = 0.45


def load_model():
    """
    Loads the trained Random Forest and scaler from disk.
    Raises a clear error if model hasn't been trained yet.
    """
    try:
        with open(MODEL_PATH,  "rb") as f:
            model  = pickle.load(f)
        with open(SCALER_PATH, "rb") as f:
            scaler = pickle.load(f)
        return model, scaler
    except FileNotFoundError:
        raise FileNotFoundError(
            "[Vestr] Model not found. Run: python -m backend.model.train"
        )


def predict(ticker: str) -> dict:
    """
    Makes a live BUY / SELL / HOLD prediction for any stock ticker.

    Pipeline:
        1. Fetch + store latest price data
        2. Compute all technical indicators
        3. Engineer derived features
        4. Run through trained Random Forest
        5. Pull live news sentiment
        6. Combine into one clean prediction result

    Args:
        ticker: stock symbol e.g. "AAPL"

    Returns:
        dict with full prediction details — signal, confidence,
        indicator snapshot, sentiment, and plain English reasoning
    """
    ticker = ticker.upper().strip()

    # Load model
    model, scaler = load_model()

    # Get data
    init_db()
    db = SessionLocal()

    try:
        # Fetch latest prices
        fetch_and_store(ticker, db, period_years=5)
        prices = get_prices(ticker, db)

        if prices.empty:
            return _error_result(ticker, "No price data found for this ticker.")

    finally:
        db.close()

    # Compute indicators + engineer features
    df = compute_all(prices)
    if len(df) < 60:
        return _error_result(ticker, "Not enough historical data to make a prediction.")

    df = engineer_features(df)

    # Check all features are present
    missing = [f for f in FEATURE_COLUMNS if f not in df.columns]
    if missing:
        return _error_result(ticker, f"Missing features: {missing}")

    # Get the most recent row — that's today's prediction
    latest = df[FEATURE_COLUMNS].iloc[-1].values.reshape(1, -1)
    latest_df     = pd.DataFrame(latest, columns=FEATURE_COLUMNS)
    latest_scaled = scaler.transform(latest_df)

    # Get prediction + probability scores for all 3 classes
    # proba = [P(SELL), P(HOLD), P(BUY)]
    proba      = model.predict_proba(latest_scaled)[0]
    prediction = model.predict(latest_scaled)[0]

    sell_conf = round(float(proba[0]), 4)
    hold_conf = round(float(proba[1]), 4)
    buy_conf  = round(float(proba[2]), 4)
    max_conf  = round(float(max(proba)), 4)

    # Map numeric label → signal string
    signal_map = {0: "SELL", 1: "HOLD", 2: "BUY"}
    signal     = signal_map[prediction]

    # Flag low confidence predictions
    is_confident = max_conf >= MIN_CONFIDENCE

    # Get latest indicator snapshot for display
    latest_row = df.iloc[-1]
    indicators = {
        "rsi"          : round(latest_row["rsi"],         2),
        "macd_line"    : round(latest_row["macd_line"],   4),
        "signal_line"  : round(latest_row["signal_line"], 4),
        "sma_10"       : round(latest_row["sma_10"],      2),
        "sma_50"       : round(latest_row["sma_50"],      2),
        "bb_upper"     : round(latest_row["bb_upper"],    2),
        "bb_lower"     : round(latest_row["bb_lower"],    2),
        "bb_bandwidth" : round(latest_row["bb_bandwidth"],4),
        "obv"          : round(latest_row["obv"],         0),
        "close"        : round(latest_row["close"],       2),
    }

    # Get live news sentiment
    print(f"[Vestr] Fetching news sentiment for {ticker}...")
    sentiment = analyse_ticker_sentiment(ticker, max_articles=20)

    # Build indicator reasoning — plain English explanations
    reasoning = _build_reasoning(indicators, sentiment)

    return {
        "ticker"        : ticker,
        "signal"        : signal,
        "confidence"    : max_conf,
        "is_confident"  : is_confident,
        "probabilities" : {
            "buy"  : buy_conf,
            "hold" : hold_conf,
            "sell" : sell_conf,
        },
        "indicators"    : indicators,
        "sentiment"     : {
            "label"         : sentiment["overall_label"],
            "score"         : sentiment["overall_score"],
            "bullish_pct"   : sentiment["bullish_pct"],
            "bearish_pct"   : sentiment["bearish_pct"],
            "article_count" : sentiment["article_count"],
            "summary"       : sentiment["summary"],
            "headlines"     : sentiment["articles"][:5],
        },
        "reasoning"     : reasoning,
        "error"         : None,
    }


def _build_reasoning(indicators: dict, sentiment: dict) -> list[str]:
    """
    Translates raw indicator values into plain English reasoning points.
    This powers both the rookie tip card and the pro detail view.

    Each point explains WHAT the indicator is saying and WHY it matters.
    """
    reasons = []

    # RSI
    rsi = indicators["rsi"]
    if rsi >= 70:
        reasons.append(
            f"RSI is {rsi:.1f} — the stock is overbought. "
            f"It has been bought so aggressively that a pullback is statistically likely soon."
        )
    elif rsi <= 30:
        reasons.append(
            f"RSI is {rsi:.1f} — the stock is oversold. "
            f"Heavy selling may be exhausted, creating a potential buying opportunity."
        )
    else:
        reasons.append(
            f"RSI is {rsi:.1f} — momentum is neutral, "
            f"neither overbought nor oversold."
        )

    # MACD
    macd   = indicators["macd_line"]
    signal = indicators["signal_line"]
    if macd > signal:
        reasons.append(
            f"MACD ({macd:.2f}) is above the signal line ({signal:.2f}) — "
            f"short term momentum is bullish and strengthening."
        )
    else:
        reasons.append(
            f"MACD ({macd:.2f}) is below the signal line ({signal:.2f}) — "
            f"short term momentum is bearish and weakening."
        )

    # Moving averages
    sma10 = indicators["sma_10"]
    sma50 = indicators["sma_50"]
    close = indicators["close"]
    if sma10 > sma50:
        reasons.append(
            f"SMA10 ({sma10:.2f}) is above SMA50 ({sma50:.2f}) — "
            f"Golden Cross pattern. Short term trend is outpacing medium term. Bullish."
        )
    else:
        reasons.append(
            f"SMA10 ({sma10:.2f}) is below SMA50 ({sma50:.2f}) — "
            f"Death Cross pattern. Short term trend is lagging medium term. Bearish."
        )

    if close > sma50:
        pct = round((close - sma50) / sma50 * 100, 1)
        reasons.append(
            f"Price (${close:.2f}) is {pct}% above the 50-day average — "
            f"stock is extended above its medium term trend."
        )
    else:
        pct = round((sma50 - close) / sma50 * 100, 1)
        reasons.append(
            f"Price (${close:.2f}) is {pct}% below the 50-day average — "
            f"stock is trading below its medium term trend."
        )

    # Bollinger Bands
    bb_upper = indicators["bb_upper"]
    bb_lower = indicators["bb_lower"]
    bb_bw    = indicators["bb_bandwidth"]
    if close >= bb_upper * 0.97:
        reasons.append(
            f"Price is near the upper Bollinger Band (${bb_upper:.2f}) — "
            f"overbought territory. High risk entry point."
        )
    elif close <= bb_lower * 1.03:
        reasons.append(
            f"Price is near the lower Bollinger Band (${bb_lower:.2f}) — "
            f"oversold territory. Potential value entry point."
        )

    if bb_bw < 0.08:
        reasons.append(
            f"Bollinger Bands are squeezing (bandwidth: {bb_bw:.3f}) — "
            f"low volatility period. A significant price move is likely incoming."
        )

    # News sentiment
    sent_label = sentiment["overall_label"]
    sent_score = sentiment["overall_score"]
    sent_summary = sentiment["summary"]
    reasons.append(f"News sentiment: {sent_label} (score: {sent_score}). {sent_summary}")

    return reasons


def _error_result(ticker: str, message: str) -> dict:
    """Returns a clean error structure when prediction can't be made"""
    return {
        "ticker"        : ticker,
        "signal"        : "UNKNOWN",
        "confidence"    : 0.0,
        "is_confident"  : False,
        "probabilities" : {"buy": 0.0, "hold": 0.0, "sell": 0.0},
        "indicators"    : {},
        "sentiment"     : {},
        "reasoning"     : [],
        "error"         : message,
    }


if __name__ == "__main__":
    """
    Live prediction test — run this to see a full prediction
    python -m backend.model.predictor
    """
    import json

    ticker = "AAPL"
    print(f"\n[Vestr] Running prediction for {ticker}...\n")

    result = predict(ticker)

    print(f"  Ticker:     {result['ticker']}")
    print(f"  Signal:     {result['signal']}")
    print(f"  Confidence: {result['confidence'] * 100:.1f}%")
    print(f"  Confident:  {result['is_confident']}")
    print(f"\n  Probabilities:")
    print(f"    BUY:  {result['probabilities']['buy']  * 100:.1f}%")
    print(f"    HOLD: {result['probabilities']['hold'] * 100:.1f}%")
    print(f"    SELL: {result['probabilities']['sell'] * 100:.1f}%")
    print(f"\n  Sentiment: {result['sentiment']['label']} ({result['sentiment']['score']})")
    print(f"\n  Reasoning:")
    for i, r in enumerate(result["reasoning"], 1):
        print(f"    {i}. {r}")