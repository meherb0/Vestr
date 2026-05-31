import pandas as pd
import numpy as np
from backend.data.database import SessionLocal, init_db
from backend.data.fetcher import get_prices, fetch_and_store
from backend.indicators.indicators import compute_all
from backend.model.train import engineer_features, FEATURE_COLUMNS, MODEL_PATH, SCALER_PATH
import pickle


def load_model():
    with open(MODEL_PATH,  "rb") as f:
        model  = pickle.load(f)
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    return model, scaler


def run_backtest(
    ticker:          str,
    starting_cash:   float = 10000.0,
    min_confidence:  float = 0.45,
    forward_days:    int   = 5,
) -> dict:
    ticker = ticker.upper().strip()

    model, scaler = load_model()
    init_db()
    db = SessionLocal()

    try:
        fetch_and_store(ticker, db, period_years=5)
        prices = get_prices(ticker, db)
    finally:
        db.close()

    if prices.empty or len(prices) < 100:
        return _error_result(ticker, "Not enough data to backtest.")

    df = compute_all(prices)
    df = engineer_features(df)
    df = df.dropna(subset=FEATURE_COLUMNS)

    cash              = starting_cash
    shares            = 0
    holding           = False
    days_held         = 0
    entry_price       = 0.0
    cooldown          = 0
    trades            = []
    portfolio_history = []

    for i in range(len(df)):
        row   = df.iloc[i]
        date  = df.index[i]
        close = row["close"]

        portfolio_value = cash + (shares * close)
        portfolio_history.append({
            "date"            : str(date),
            "portfolio_value" : round(portfolio_value, 2),
            "close"           : round(close, 2),
            "holding"         : holding,
        })

        if i >= len(df) - forward_days:
            continue

        features   = df[FEATURE_COLUMNS].iloc[i].values.reshape(1, -1)
        feat_df    = pd.DataFrame(features, columns=FEATURE_COLUMNS)
        scaled     = scaler.transform(feat_df)
        proba      = model.predict_proba(scaled)[0]
        signal     = model.predict(scaled)[0]
        confidence = max(proba)

        # ── Stop loss — always runs before confidence check ──
        if holding and close < entry_price * 0.85:
            sell_value = shares * close
            profit     = sell_value - (shares * entry_price)
            profit_pct = (close - entry_price) / entry_price * 100

            trades.append({
                "type"       : "SELL (stop loss)",
                "date"       : str(date),
                "price"      : round(close, 2),
                "shares"     : round(shares, 4),
                "value"      : round(sell_value, 2),
                "profit"     : round(profit, 2),
                "profit_pct" : round(profit_pct, 2),
                "confidence" : 0.0,
                "days_held"  : days_held,
            })

            cash     = sell_value
            shares   = 0.0
            holding  = False
            cooldown = 20  # wait 20 days before buying again after stop loss
            print(f"[Vestr] Stop loss triggered on {ticker} at ${close:.2f}")

        # ── Cooldown countdown ──
        if cooldown > 0:
            cooldown -= 1

        # ── Skip low confidence signals ──
        if confidence < min_confidence:
            if holding:
                days_held += 1
            continue

        # ── BUY logic ──
        if signal == 2 and not holding and cooldown == 0:
            shares      = cash / close
            cash        = 0.0
            holding     = True
            days_held   = 0
            entry_price = close

            trades.append({
                "type"       : "BUY",
                "date"       : str(date),
                "price"      : round(close, 2),
                "shares"     : round(shares, 4),
                "value"      : round(shares * close, 2),
                "confidence" : round(confidence, 4),
            })

        # ── SELL logic ──
        elif signal == 0 and holding and days_held >= forward_days:
            sell_value = shares * close
            profit     = sell_value - (shares * entry_price)
            profit_pct = (close - entry_price) / entry_price * 100

            trades.append({
                "type"       : "SELL",
                "date"       : str(date),
                "price"      : round(close, 2),
                "shares"     : round(shares, 4),
                "value"      : round(sell_value, 2),
                "profit"     : round(profit, 2),
                "profit_pct" : round(profit_pct, 2),
                "confidence" : round(confidence, 4),
                "days_held"  : days_held,
            })

            cash    = sell_value
            shares  = 0.0
            holding = False

        if holding:
            days_held += 1

    # ── Close open position at end ──
    if holding and shares > 0:
        final_price = df["close"].iloc[-1]
        sell_value  = shares * final_price
        profit      = sell_value - (shares * entry_price)
        profit_pct  = (final_price - entry_price) / entry_price * 100

        trades.append({
            "type"       : "SELL (end)",
            "date"       : str(df.index[-1]),
            "price"      : round(final_price, 2),
            "shares"     : round(shares, 4),
            "value"      : round(sell_value, 2),
            "profit"     : round(profit, 2),
            "profit_pct" : round(profit_pct, 2),
            "confidence" : 0.0,
            "days_held"  : days_held,
        })
        cash = sell_value

    # ── Performance metrics ──
    final_value     = cash
    total_return    = (final_value - starting_cash) / starting_cash * 100
    first_close     = df["close"].iloc[0]
    last_close      = df["close"].iloc[-1]
    buy_hold_return = (last_close - first_close) / first_close * 100
    sell_trades     = [t for t in trades if "profit" in t]
    winning         = [t for t in sell_trades if t["profit"] > 0]
    win_rate        = len(winning) / len(sell_trades) * 100 if sell_trades else 0.0
    values          = [p["portfolio_value"] for p in portfolio_history]
    max_drawdown    = _calculate_max_drawdown(values)
    returns         = pd.Series(values).pct_change().dropna()
    sharpe          = _calculate_sharpe(returns)
    avg_profit_pct  = (
        sum(t["profit_pct"] for t in sell_trades) / len(sell_trades)
        if sell_trades else 0.0
    )

    return {
        "ticker"            : ticker,
        "starting_cash"     : starting_cash,
        "final_value"       : round(final_value, 2),
        "total_return_pct"  : round(total_return, 2),
        "buy_hold_return"   : round(buy_hold_return, 2),
        "total_trades"      : len(sell_trades),
        "winning_trades"    : len(winning),
        "win_rate"          : round(win_rate, 2),
        "max_drawdown"      : round(max_drawdown, 2),
        "sharpe_ratio"      : round(sharpe, 3),
        "avg_profit_pct"    : round(avg_profit_pct, 2),
        "trades"            : trades,
        "portfolio_history" : portfolio_history,
        "error"             : None,
    }


def _calculate_max_drawdown(values: list) -> float:
    peak   = values[0]
    max_dd = 0.0
    for v in values:
        if v > peak:
            peak = v
        drawdown = (v - peak) / peak * 100
        if drawdown < max_dd:
            max_dd = drawdown
    return max_dd


def _calculate_sharpe(returns: pd.Series, risk_free_rate: float = 0.05) -> float:
    if returns.std() == 0:
        return 0.0
    daily_rf = risk_free_rate / 252
    excess   = returns.mean() - daily_rf
    sharpe   = (excess / returns.std()) * np.sqrt(252)
    return sharpe


def _error_result(ticker: str, message: str) -> dict:
    return {
        "ticker"            : ticker,
        "starting_cash"     : 0,
        "final_value"       : 0,
        "total_return_pct"  : 0,
        "buy_hold_return"   : 0,
        "total_trades"      : 0,
        "winning_trades"    : 0,
        "win_rate"          : 0,
        "max_drawdown"      : 0,
        "sharpe_ratio"      : 0,
        "avg_profit_pct"    : 0,
        "trades"            : [],
        "portfolio_history" : [],
        "error"             : message,
    }


if __name__ == "__main__":
    print("\n[Vestr] Running backtest for AAPL...\n")
    result = run_backtest("AAPL", starting_cash=10000.0)

    if result["error"]:
        print(f"Error: {result['error']}")
    else:
        print(f"  Ticker:            {result['ticker']}")
        print(f"  Starting Cash:     ${result['starting_cash']:,.2f}")
        print(f"  Final Value:       ${result['final_value']:,.2f}")
        print(f"  Total Return:      {result['total_return_pct']:+.2f}%")
        print(f"  Buy & Hold Return: {result['buy_hold_return']:+.2f}%")
        print(f"  Total Trades:      {result['total_trades']}")
        print(f"  Win Rate:          {result['win_rate']:.1f}%")
        print(f"  Max Drawdown:      {result['max_drawdown']:.2f}%")
        print(f"  Sharpe Ratio:      {result['sharpe_ratio']:.3f}")
        print(f"  Avg Profit/Trade:  {result['avg_profit_pct']:+.2f}%")
        print(f"\n  Last 5 trades:")
        for t in result["trades"][-5:]:
            if "profit" in t:
                print(f"    {t['type']:18} {t['date']}  ${t['price']}  "
                      f"P&L: {t['profit_pct']:+.2f}%")
            else:
                print(f"    {t['type']:18} {t['date']}  ${t['price']}")