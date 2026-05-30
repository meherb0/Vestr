import pandas as pd
import numpy as np


def compute_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Relative Strength Index — measures momentum.
    Tells us if a stock is overbought (>70) or oversold (<30).

    Formula:
        delta = daily price change
        RS    = avg_gain / avg_loss over 'period' days
        RSI   = 100 - (100 / (1 + RS))
    """
    delta = df["close"].diff()  # daily price change

    # Separate gains and losses — losses become 0 on gain days and vice versa
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    # Exponentially weighted mean — more recent days weighted heavier
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()

    rs  = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return rsi.rename("rsi")


def compute_macd(
    df: pd.DataFrame,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9
) -> pd.DataFrame:
    """
    MACD — Moving Average Convergence Divergence.
    Measures trend momentum and direction.

    Components:
        macd_line    = fast EMA - slow EMA
        signal_line  = 9-day EMA of macd_line
        histogram    = macd_line - signal_line (shows momentum strength)
    """
    ema_fast   = df["close"].ewm(span=fast,   adjust=False).mean()
    ema_slow   = df["close"].ewm(span=slow,   adjust=False).mean()
    macd_line  = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram  = macd_line - signal_line

    return pd.DataFrame({
        "macd_line"   : macd_line,
        "signal_line" : signal_line,
        "histogram"   : histogram,
    })


def compute_sma(df: pd.DataFrame, periods: list = [10, 50]) -> pd.DataFrame:
    """
    Simple Moving Averages — smooths out price noise to show trend direction.

    SMA 10  = short term trend
    SMA 50  = medium term trend

    Golden Cross: SMA10 crosses above SMA50 → bullish
    Death Cross:  SMA10 crosses below SMA50 → bearish
    """
    result = {}
    for p in periods:
        result[f"sma_{p}"] = df["close"].rolling(window=p).mean()
    return pd.DataFrame(result)


def compute_bollinger_bands(
    df: pd.DataFrame,
    period: int = 20,
    std_dev: float = 2.0
) -> pd.DataFrame:
    """
    Bollinger Bands — measures volatility around a moving average.

    middle = 20-day SMA
    upper  = middle + (2 × standard deviation)
    lower  = middle - (2 × standard deviation)

    Price near upper band = potentially overbought
    Price near lower band = potentially oversold
    Bands squeezing      = big move incoming
    """
    middle = df["close"].rolling(window=period).mean()
    std    = df["close"].rolling(window=period).std()
    upper  = middle + (std_dev * std)
    lower  = middle - (std_dev * std)

    # Bandwidth = how wide the bands are (measures volatility level)
    bandwidth = (upper - lower) / middle

    return pd.DataFrame({
        "bb_middle"    : middle,
        "bb_upper"     : upper,
        "bb_lower"     : lower,
        "bb_bandwidth" : bandwidth,
    })

def compute_obv(df: pd.DataFrame) -> pd.Series:
    """
    On Balance Volume — tracks whether volume is flowing
    into or out of a stock. Confirms or contradicts price moves.

    Rising OBV with rising price  → confirmed trend (strong signal)
    Rising OBV with falling price → accumulation (reversal coming)
    Falling OBV with rising price → distribution (warning sign)
    """
    obv    = [0]
    closes = df["close"].values
    volumes = df["volume"].values

    for i in range(1, len(closes)):
        if closes[i] > closes[i - 1]:
            obv.append(obv[-1] + volumes[i])
        elif closes[i] < closes[i - 1]:
            obv.append(obv[-1] - volumes[i])
        else:
            obv.append(obv[-1])

    return pd.Series(obv, index=df.index, name="obv")


def compute_all(df: pd.DataFrame) -> pd.DataFrame:
    """
    Master function — computes ALL indicators on a price DataFrame
    and returns one combined DataFrame with everything.

    This is what every other component (ML model, tips engine) will call.

    Args:
        df: price DataFrame with columns: open, high, low, close, volume
            indexed by date (as returned by fetcher.get_prices)

    Returns:
        DataFrame with all indicator columns added, NaN rows dropped
    """
    if df.empty:
        return df

    rsi  = compute_rsi(df)
    macd = compute_macd(df)
    sma  = compute_sma(df, periods=[10, 50])
    bb   = compute_bollinger_bands(df)

    # Combine everything into one DataFrame
    obv    = compute_obv(df)
    result = pd.concat([df, rsi, macd, sma, bb, obv], axis=1)

    # Drop rows where indicators haven't had enough data to calculate yet
    # (first ~50 rows will have NaN values until moving averages warm up)
    result.dropna(inplace=True)

    return result


if __name__ == "__main__":
    """
    Quick test — run this to verify indicators are computing correctly
    python -m backend.indicators.indicators
    """
    from backend.data.database import SessionLocal, init_db
    from backend.data.fetcher import get_prices

    init_db()
    db = SessionLocal()

    try:
        df     = get_prices("AAPL", db)
        result = compute_all(df)

        print(f"[Vestr] Computed indicators for AAPL — {len(result)} rows\n")
        print("Latest indicator values:")
        print(f"  RSI:          {result['rsi'].iloc[-1]:.2f}")
        print(f"  MACD line:    {result['macd_line'].iloc[-1]:.4f}")
        print(f"  Signal line:  {result['signal_line'].iloc[-1]:.4f}")
        print(f"  SMA 10:       {result['sma_10'].iloc[-1]:.2f}")
        print(f"  SMA 50:       {result['sma_50'].iloc[-1]:.2f}")
        print(f"  BB Upper:     {result['bb_upper'].iloc[-1]:.2f}")
        print(f"  BB Lower:     {result['bb_lower'].iloc[-1]:.2f}")
        print(f"  BB Bandwidth: {result['bb_bandwidth'].iloc[-1]:.4f}")
    finally:
        db.close()