import pickle
import numpy as np
import pandas as pd
from pathlib import Path

MODEL_PATH  = Path(__file__).parent.parent / 'model' / 'vestr_model.pkl'
SCALER_PATH = Path(__file__).parent.parent / 'model' / 'vestr_scaler.pkl'

FEATURE_COLS = [
    'rsi','macd_line','signal_line','sma_10','sma_50',
    'bb_upper','bb_lower','bb_bandwidth','obv',
    'close_norm','volume_norm',
]


def _fetch_data(ticker: str) -> pd.DataFrame:
    import yfinance as yf
    df = yf.Ticker(ticker).history(period='5y')
    if df.empty:
        raise ValueError(f"No data found for {ticker}")
    return df[['Open','High','Low','Close','Volume']].copy().dropna()


def _compute_features(df: pd.DataFrame) -> pd.DataFrame:
    df    = df.copy()
    close = df['Close']
    vol   = df['Volume']

    delta    = close.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs       = avg_gain / avg_loss.replace(0, np.nan)
    df['rsi'] = 100 - (100 / (1 + rs))

    ema12             = close.ewm(span=12, adjust=False).mean()
    ema26             = close.ewm(span=26, adjust=False).mean()
    df['macd_line']   = ema12 - ema26
    df['signal_line'] = df['macd_line'].ewm(span=9, adjust=False).mean()

    df['sma_10'] = close.rolling(10).mean()
    df['sma_50'] = close.rolling(50).mean()

    sma_20             = close.rolling(20).mean()
    std_20             = close.rolling(20).std()
    df['bb_upper']     = sma_20 + 2 * std_20
    df['bb_lower']     = sma_20 - 2 * std_20
    df['bb_bandwidth'] = (df['bb_upper'] - df['bb_lower']) / sma_20.replace(0, np.nan)

    df['obv']         = (np.sign(close.diff()) * vol).fillna(0).cumsum()
    df['close_norm']  = close / close.rolling(50).mean()
    df['volume_norm'] = vol / vol.rolling(20).mean()
    df['close']       = close

    return df.dropna()


def run_backtest(
    ticker         : str,
    starting_cash  : float = 10000.0,
    min_confidence : float = 0.40,
    stop_loss_pct  : float = 0.15,
    cooldown_days  : int   = 20,
) -> dict:
    ticker = ticker.upper().strip()

    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        with open(SCALER_PATH, 'rb') as f:
            scaler = pickle.load(f)
    except Exception as e:
        return _error_result(ticker, f"Model not loaded: {e}")

    try:
        df = _fetch_data(ticker)
    except Exception as e:
        return _error_result(ticker, str(e))

    df = _compute_features(df)

    if len(df) < 100:
        return _error_result(ticker, "Not enough historical data.")

    cash        = starting_cash
    shares      = 0.0
    holding     = False
    days_held   = 0
    entry_price = 0.0
    cooldown    = 0
    trades      = []
    port_values = []

    for i in range(len(df)):
        row   = df.iloc[i]
        close = float(row['close'])

        port_val = cash + shares * close
        port_values.append(port_val)

        if i >= len(df) - 5:
            continue

        try:
            X      = np.array([[row[f] for f in FEATURE_COLS]])
            X_sc   = scaler.transform(X)
            proba  = model.predict_proba(X_sc)[0]
            signal = model.predict(X_sc)[0]
            conf   = float(max(proba))
        except Exception:
            continue

        if holding and close < entry_price * (1 - stop_loss_pct):
            pnl = (close - entry_price) / entry_price * 100
            trades.append({
                'type'      : 'SELL (stop loss)',
                'price'     : round(close, 2),
                'profit_pct': round(pnl, 2),
                'profit'    : round((close - entry_price) * shares, 2),
            })
            cash     = shares * close
            shares   = 0.0
            holding  = False
            cooldown = cooldown_days

        if cooldown > 0:
            cooldown -= 1

        if conf < min_confidence:
            if holding: days_held += 1
            continue

        if signal == 'BUY' and not holding and cooldown == 0:
            shares      = cash / close
            cash        = 0.0
            holding     = True
            entry_price = close
            days_held   = 0
            trades.append({'type':'BUY','price':round(close,2),'confidence':round(conf,4)})

        elif signal == 'SELL' and holding and days_held >= 5:
            pnl = (close - entry_price) / entry_price * 100
            trades.append({
                'type'      : 'SELL',
                'price'     : round(close, 2),
                'profit_pct': round(pnl, 2),
                'profit'    : round((close - entry_price) * shares, 2),
            })
            cash    = shares * close
            shares  = 0.0
            holding = False

        if holding:
            days_held += 1

    if holding and shares > 0:
        final = float(df['close'].iloc[-1])
        pnl   = (final - entry_price) / entry_price * 100
        trades.append({
            'type'      : 'SELL (end)',
            'price'     : round(final, 2),
            'profit_pct': round(pnl, 2),
            'profit'    : round((final - entry_price) * shares, 2),
        })
        cash = shares * final

    final_val    = cash
    strategy_ret = (final_val - starting_cash) / starting_cash * 100
    first_close  = float(df['close'].iloc[0])
    last_close   = float(df['close'].iloc[-1])
    buyhold_ret  = (last_close - first_close) / first_close * 100
    sell_trades  = [t for t in trades if 'profit' in t]
    winning      = [t for t in sell_trades if t['profit'] > 0]
    win_rate     = len(winning) / len(sell_trades) if sell_trades else 0.0
    max_dd       = _max_drawdown(port_values)
    rets         = pd.Series(port_values).pct_change().dropna()
    sharpe       = _sharpe(rets)

    return {
        'ticker'          : ticker,
        'starting_cash'   : starting_cash,
        'final_value'     : round(final_val, 2),
        'strategy_return' : round(strategy_ret, 2),
        'total_return'    : round(strategy_ret, 2),
        'buyhold_return'  : round(buyhold_ret, 2),
        'buy_hold_return' : round(buyhold_ret, 2),
        'num_trades'      : len(sell_trades),
        'total_trades'    : len(sell_trades),
        'win_rate'        : round(win_rate, 4),
        'max_drawdown'    : round(max_dd, 2),
        'sharpe_ratio'    : round(sharpe, 3),
        'trades'          : trades,
        'error'           : None,
    }


def _max_drawdown(values: list) -> float:
    if not values: return 0.0
    peak   = values[0]
    max_dd = 0.0
    for v in values:
        if v > peak: peak = v
        dd = (v - peak) / peak * 100
        if dd < max_dd: max_dd = dd
    return max_dd


def _sharpe(returns: pd.Series, rf: float = 0.05) -> float:
    if len(returns) == 0 or returns.std() == 0: return 0.0
    excess = returns.mean() - rf / 252
    return float((excess / returns.std()) * np.sqrt(252))


def _error_result(ticker: str, message: str) -> dict:
    return {
        'ticker'          : ticker,
        'starting_cash'   : 0,
        'final_value'     : 0,
        'strategy_return' : 0,
        'total_return'    : 0,
        'buyhold_return'  : 0,
        'buy_hold_return' : 0,
        'num_trades'      : 0,
        'total_trades'    : 0,
        'win_rate'        : 0,
        'max_drawdown'    : 0,
        'sharpe_ratio'    : 0,
        'trades'          : [],
        'error'           : message,
    }