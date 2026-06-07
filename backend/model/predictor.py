import pickle
import numpy as np
import pandas as pd
from pathlib import Path

MODEL_PATH  = Path(__file__).parent / 'vestr_model.pkl'
SCALER_PATH = Path(__file__).parent / 'vestr_scaler.pkl'

FEATURE_COLS = [
    'rsi','macd_line','signal_line','sma_10','sma_50',
    'bb_upper','bb_lower','bb_bandwidth','obv',
    'close_norm','volume_norm',
]


def _load_model():
    with open(MODEL_PATH, 'rb') as f:
        return pickle.load(f)

def _load_scaler():
    with open(SCALER_PATH, 'rb') as f:
        return pickle.load(f)


def _get_price_data(ticker: str) -> pd.DataFrame:
    """Try SQLite first, fall back to yFinance for any ticker."""
    ticker = ticker.upper().strip()

    # Try SQLite
    try:
        from backend.data.database import SessionLocal
        from backend.data.models import StockPrice

        db = SessionLocal()
        try:
            records = (
                db.query(StockPrice)
                .filter(StockPrice.ticker == ticker)
                .order_by(StockPrice.date)
                .all()
            )
            if len(records) >= 150:
                df = pd.DataFrame([{
                    'Open'  : r.open,
                    'High'  : r.high,
                    'Low'   : r.low,
                    'Close' : r.close,
                    'Volume': r.volume,
                } for r in records], index=[r.date for r in records])
                df.index = pd.to_datetime(df.index)
                return df
        finally:
            db.close()
    except Exception:
        pass

    # Fall back to yFinance — works for any ticker
    import yfinance as yf
    df = yf.Ticker(ticker).history(period='2y')
    if df.empty:
        raise ValueError(f"No data found for {ticker}")
    return df[['Open','High','Low','Close','Volume']].copy().dropna()


def _compute_indicators(df: pd.DataFrame) -> dict:
    """Computes all indicators and returns both ML features and display values."""
    close = df['Close']
    vol   = df['Volume']

    # RSI
    delta    = close.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs       = avg_gain / avg_loss.replace(0, np.nan)
    rsi      = 100 - (100 / (1 + rs))

    # MACD
    ema12       = close.ewm(span=12, adjust=False).mean()
    ema26       = close.ewm(span=26, adjust=False).mean()
    macd_line   = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()

    # SMAs
    sma_10 = close.rolling(10).mean()
    sma_50 = close.rolling(50).mean()

    # Bollinger Bands
    sma_20       = close.rolling(20).mean()
    std_20       = close.rolling(20).std()
    bb_upper     = sma_20 + 2 * std_20
    bb_lower     = sma_20 - 2 * std_20
    bb_bandwidth = (bb_upper - bb_lower) / sma_20.replace(0, np.nan)

    # OBV
    obv = (np.sign(close.diff()) * vol).fillna(0).cumsum()

    # Normalised
    close_norm  = close / close.rolling(50).mean()
    volume_norm = vol / vol.rolling(20).mean()

    i = -1
    return {
        # Display values
        'rsi'          : float(rsi.iloc[i]),
        'macd_line'    : float(macd_line.iloc[i]),
        'signal_line'  : float(signal_line.iloc[i]),
        'sma_10'       : float(sma_10.iloc[i]),
        'sma_50'       : float(sma_50.iloc[i]),
        'bb_upper'     : float(bb_upper.iloc[i]),
        'bb_lower'     : float(bb_lower.iloc[i]),
        'bb_bandwidth' : float(bb_bandwidth.iloc[i]),
        'obv'          : float(obv.iloc[i]),
        'close'        : float(close.iloc[i]),
        # ML-only features
        'close_norm'   : float(close_norm.iloc[i]),
        'volume_norm'  : float(volume_norm.iloc[i]),
    }


def predict(ticker: str) -> dict:
    """Full prediction for any ticker on any exchange."""
    ticker = ticker.upper().strip()

    try:
        df         = _get_price_data(ticker)
        indicators = _compute_indicators(df)

        model  = _load_model()
        scaler = _load_scaler()

        X        = np.array([[indicators[f] for f in FEATURE_COLS]])
        X_scaled = scaler.transform(X)

        classes   = list(model.classes_)
        proba     = model.predict_proba(X_scaled)[0]
        prob_dict = {c.lower(): float(p) for c, p in zip(classes, proba)}

        buy_prob  = prob_dict.get('buy',  0.33)
        hold_prob = prob_dict.get('hold', 0.34)
        sell_prob = prob_dict.get('sell', 0.33)

        confidence = max(buy_prob, hold_prob, sell_prob)

        if buy_prob >= sell_prob and buy_prob >= hold_prob:
            signal = 'BUY'
        elif sell_prob >= buy_prob and sell_prob >= hold_prob:
            signal = 'SELL'
        else:
            signal = 'HOLD'

        # Display indicators (without ML-only fields)
        display_indicators = {k: v for k, v in indicators.items()
                               if k not in ('close_norm', 'volume_norm')}

        return {
            'ticker'       : ticker,
            'signal'       : signal,
            'confidence'   : confidence,
            'is_confident' : confidence >= 0.45,
            'probabilities': {
                'buy'  : buy_prob,
                'hold' : hold_prob,
                'sell' : sell_prob,
            },
            'indicators' : display_indicators,
            'sentiment'  : {},   # filled by generator.py
            'reasoning'  : [],   # filled by generator.py
            'error'      : None,
        }

    except Exception as e:
        return {
            'ticker'       : ticker,
            'signal'       : 'HOLD',
            'confidence'   : 0.0,
            'is_confident' : False,
            'probabilities': {'buy': 0.33, 'hold': 0.34, 'sell': 0.33},
            'indicators'   : {
                'rsi':0,'macd_line':0,'signal_line':0,'sma_10':0,'sma_50':0,
                'bb_upper':0,'bb_lower':0,'bb_bandwidth':0,'obv':0,'close':0,
            },
            'sentiment'    : {},
            'reasoning'    : [],
            'error'        : str(e),
        }