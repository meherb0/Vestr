from backend.model.predictor import predict


# ── Verdict thresholds ────────────────────────────────────────
# These constants control how aggressively we classify signals
# Tweak these later as you learn more about what works

RSI_OVERBOUGHT    = 70
RSI_OVERSOLD      = 30
HIGH_CONFIDENCE   = 0.50
MEDIUM_CONFIDENCE = 0.40
STRONG_SENTIMENT  = 0.15   # compound score for "strongly bullish/bearish"


def generate_tip(ticker: str) -> dict:
    """
    Master function — generates a complete investment tip for any ticker.

    Pipeline:
        1. Run full prediction (indicators + ML + sentiment)
        2. Score each signal independently
        3. Combine scores into an overall verdict
        4. Override verdict if indicators strongly contradict ML signal
        5. Calculate risk level
        6. Suggest entry price
        7. Build rookie and pro tip cards

    Verdicts (in order of strength):
        STRONG BUY  → multiple signals aligned bullishly, high confidence
        BUY         → more bullish signals than bearish, decent confidence
        WATCH       → mixed signals, low confidence, or overbought on BUY
        SELL        → more bearish signals than bullish
        STRONG SELL → multiple signals aligned bearishly, high confidence

    Args:
        ticker: stock symbol e.g. "AAPL"

    Returns:
        dict with full tip — verdict, risk level, entry suggestion,
        rookie card, pro card, and all underlying data
    """
    ticker = ticker.upper().strip()
    print(f"[Vestr] Generating tip for {ticker}...")

    # Get full prediction
    pred = predict(ticker)

    if pred["error"]:
        return _error_tip(ticker, pred["error"])

    indicators = pred["indicators"]
    sentiment  = pred["sentiment"]
    signal     = pred["signal"]
    confidence = pred["confidence"]
    probs      = pred["probabilities"]

    # ── Score each signal ─────────────────────────────────────
    # Each signal contributes +1 (bullish), -1 (bearish), or 0 (neutral)
    # We sum these to get an overall directional score

    score  = 0
    notes  = []   # collected reasoning points for display

    # 1. ML model signal
    if signal == "BUY" and confidence >= MEDIUM_CONFIDENCE:
        score += 2 if confidence >= HIGH_CONFIDENCE else 1
        notes.append(("bullish", f"ML model signals BUY with {confidence*100:.1f}% confidence."))
    elif signal == "SELL" and confidence >= MEDIUM_CONFIDENCE:
        score -= 2 if confidence >= HIGH_CONFIDENCE else 1
        notes.append(("bearish", f"ML model signals SELL with {confidence*100:.1f}% confidence."))
    else:
        notes.append(("neutral", f"ML model is uncertain ({confidence*100:.1f}% confidence). No strong directional signal."))

    # 2. RSI
    rsi = indicators["rsi"]
    if rsi >= RSI_OVERBOUGHT:
        score -= 1
        notes.append(("bearish", f"RSI {rsi:.1f} — overbought. Statistically likely to pull back soon."))
    elif rsi <= RSI_OVERSOLD:
        score += 1
        notes.append(("bullish", f"RSI {rsi:.1f} — oversold. Selling pressure may be exhausted."))
    else:
        notes.append(("neutral", f"RSI {rsi:.1f} — neutral momentum, neither overbought nor oversold."))

    # 3. MACD
    macd   = indicators["macd_line"]
    sig    = indicators["signal_line"]
    if macd > sig:
        score += 1
        notes.append(("bullish", f"MACD ({macd:.2f}) above signal line ({sig:.2f}) — bullish momentum."))
    else:
        score -= 1
        notes.append(("bearish", f"MACD ({macd:.2f}) below signal line ({sig:.2f}) — bearish momentum."))

    # 4. Moving averages — Golden/Death Cross
    sma10 = indicators["sma_10"]
    sma50 = indicators["sma_50"]
    close = indicators["close"]
    if sma10 > sma50:
        score += 1
        notes.append(("bullish", f"Golden Cross — SMA10 (${sma10:.2f}) above SMA50 (${sma50:.2f}). Uptrend confirmed."))
    else:
        score -= 1
        notes.append(("bearish", f"Death Cross — SMA10 (${sma10:.2f}) below SMA50 (${sma50:.2f}). Downtrend confirmed."))

    # 5. Bollinger Band position
    bb_upper = indicators["bb_upper"]
    bb_lower = indicators["bb_lower"]
    bb_bw    = indicators["bb_bandwidth"]
    if close >= bb_upper * 0.97:
        score -= 1
        notes.append(("bearish", f"Price near upper Bollinger Band (${bb_upper:.2f}) — high risk entry point."))
    elif close <= bb_lower * 1.03:
        score += 1
        notes.append(("bullish", f"Price near lower Bollinger Band (${bb_lower:.2f}) — potential value entry."))

    if bb_bw < 0.08:
        notes.append(("neutral", f"Bollinger Bands squeezing — big move incoming, direction unclear."))

    # 6. News sentiment
    sent_score = sentiment.get("score", 0)
    sent_label = sentiment.get("label", "Neutral")
    if sent_score >= STRONG_SENTIMENT:
        score += 1
        notes.append(("bullish", f"News sentiment: {sent_label} ({sent_score:.3f}). {sentiment.get('summary', '')}"))
    elif sent_score <= -STRONG_SENTIMENT:
        score -= 1
        notes.append(("bearish", f"News sentiment: {sent_label} ({sent_score:.3f}). {sentiment.get('summary', '')}"))
    else:
        notes.append(("neutral", f"News sentiment: {sent_label} ({sent_score:.3f}). {sentiment.get('summary', '')}"))

    # ── Determine verdict from score ──────────────────────────
    #
    # Score range is roughly -7 to +7
    # We map this to 5 verdict levels
    #
    # Special override rules:
    #   RSI >= 70 + BUY signal → downgrade to WATCH (overbought)
    #   RSI <= 30 + SELL signal → downgrade to WATCH (oversold)
    #   Low confidence on any directional signal → cap at WATCH

    if score >= 4:
        verdict = "STRONG BUY"
    elif score >= 2:
        verdict = "BUY"
    elif score >= -1:
        verdict = "WATCH"
    elif score >= -3:
        verdict = "SELL"
    else:
        verdict = "STRONG SELL"

    # ── Override rules ────────────────────────────────────────
    # These catch situations where the raw score says BUY
    # but risk factors make it a bad entry right now

    if verdict in ("BUY", "STRONG BUY"):
        if rsi >= RSI_OVERBOUGHT:
            verdict = "WATCH"
            notes.append(("warning", "Verdict downgraded to WATCH — overbought RSI makes this a risky entry. Wait for a pullback."))
        elif confidence < MEDIUM_CONFIDENCE:
            verdict = "WATCH"
            notes.append(("warning", "Verdict downgraded to WATCH — model confidence too low for a confident BUY call."))

    if verdict in ("SELL", "STRONG SELL"):
        if rsi <= RSI_OVERSOLD:
            verdict = "WATCH"
            notes.append(("warning", "Verdict moderated to WATCH — oversold RSI suggests selling pressure may be near exhaustion."))

    # ── Risk level ────────────────────────────────────────────
    risk_level = _calculate_risk(rsi, bb_bw, confidence, sent_score, close, sma50)

    # ── Entry suggestion ──────────────────────────────────────
    entry = _suggest_entry(verdict, close, sma10, sma50, bb_lower, rsi)

    # ── Build tip cards ───────────────────────────────────────
    rookie_card = _build_rookie_card(ticker, verdict, risk_level, entry, notes, close)
    pro_card    = _build_pro_card(ticker, verdict, score, confidence, probs,
                                   indicators, sentiment, notes)

    return {
        "ticker"      : ticker,
        "verdict"     : verdict,
        "score"       : score,
        "risk_level"  : risk_level,
        "entry"       : entry,
        "rookie_card" : rookie_card,
        "pro_card"    : pro_card,
        "notes"       : notes,
        "prediction"  : pred,
        "error"       : None,
    }


def _calculate_risk(
    rsi:        float,
    bb_bw:      float,
    confidence: float,
    sent_score: float,
    close:      float,
    sma50:      float,
) -> str:
    """
    Calculates risk level based on multiple volatility and uncertainty factors.

    Low    → stable trend, neutral RSI, decent confidence
    Medium → some overbought signals or mixed confidence
    High   → extreme RSI, high volatility, low confidence
    """
    risk_score = 0

    if rsi >= 75 or rsi <= 25:
        risk_score += 2
    elif rsi >= 70 or rsi <= 30:
        risk_score += 1

    if bb_bw > 0.20:
        risk_score += 2    # very high volatility
    elif bb_bw > 0.12:
        risk_score += 1

    if confidence < MEDIUM_CONFIDENCE:
        risk_score += 1

    price_vs_sma50 = abs((close - sma50) / sma50)
    if price_vs_sma50 > 0.20:
        risk_score += 1    # very extended from mean

    if risk_score >= 4:
        return "High"
    elif risk_score >= 2:
        return "Medium"
    else:
        return "Low"


def _suggest_entry(
    verdict:   str,
    close:     float,
    sma10:     float,
    sma50:     float,
    bb_lower:  float,
    rsi:       float,
) -> dict:
    """
    Suggests an entry price and rationale based on verdict and indicators.

    For overbought BUY/WATCH: suggest waiting for pullback to SMA10
    For normal BUY: current price is reasonable
    For oversold:   near lower Bollinger Band is a good entry
    For SELL:       no entry suggested
    """
    if verdict in ("SELL", "STRONG SELL"):
        return {
            "price"     : None,
            "rationale" : "No entry recommended. Wait for bullish reversal signals."
        }

    if verdict == "WATCH" and rsi >= RSI_OVERBOUGHT:
        suggested = round(sma10, 2)
        return {
            "price"     : suggested,
            "rationale" : f"Wait for pullback to SMA10 support (~${suggested:.2f}) before entering."
        }

    if rsi <= RSI_OVERSOLD:
        suggested = round(bb_lower * 1.02, 2)
        return {
            "price"     : suggested,
            "rationale" : f"Near oversold territory — entry near lower band (~${suggested:.2f}) offers good risk/reward."
        }

    if verdict in ("BUY", "STRONG BUY"):
        return {
            "price"     : round(close, 2),
            "rationale" : "Current price is a reasonable entry given bullish signal alignment."
        }

    return {
        "price"     : None,
        "rationale" : "Monitor for clearer signal before committing."
    }


def _build_rookie_card(
    ticker:     str,
    verdict:    str,
    risk_level: str,
    entry:      dict,
    notes:      list,
    close:      float,
) -> dict:
    """
    Builds the simplified rookie-friendly tip card.
    Plain English only — no raw numbers except price and entry.
    """
    verdict_emoji = {
        "STRONG BUY"  : "✅✅",
        "BUY"         : "✅",
        "WATCH"       : "👀",
        "SELL"        : "⚠️",
        "STRONG SELL" : "🚨",
    }

    verdict_explanation = {
        "STRONG BUY"  : "Multiple strong signals suggest this stock is likely to rise. Good time to consider buying.",
        "BUY"         : "More positive signals than negative. Conditions are reasonably favourable for buying.",
        "WATCH"       : "Mixed signals right now. Not the best time to buy or sell — keep an eye on it.",
        "SELL"        : "More negative signals than positive. Consider reducing exposure or waiting.",
        "STRONG SELL" : "Multiple strong negative signals. High risk of further decline.",
    }

    risk_explanation = {
        "Low"    : "This stock is relatively stable right now. Lower chance of sudden big moves.",
        "Medium" : "Some volatility present. Don't invest more than you're comfortable losing.",
        "High"   : "High volatility or extreme conditions. Only invest what you can afford to lose entirely.",
    }

    # Pull only the most important bullish/bearish notes for rookies
    key_notes = [n[1] for n in notes if n[0] in ("bullish", "bearish")][:3]
    warnings  = [n[1] for n in notes if n[0] == "warning"]

    entry_text = (
        f"Suggested entry: ~${entry['price']:.2f} — {entry['rationale']}"
        if entry["price"]
        else entry["rationale"]
    )

    return {
        "verdict"             : f"{verdict_emoji.get(verdict, '')} {verdict}",
        "verdict_explanation" : verdict_explanation[verdict],
        "current_price"       : f"${close:.2f}",
        "risk_level"          : risk_level,
        "risk_explanation"    : risk_explanation[risk_level],
        "key_reasons"         : key_notes,
        "warnings"            : warnings,
        "entry"               : entry_text,
    }


def _build_pro_card(
    ticker:     str,
    verdict:    str,
    score:      int,
    confidence: float,
    probs:      dict,
    indicators: dict,
    sentiment:  dict,
    notes:      list,
) -> dict:
    """
    Builds the full pro tip card with all raw values.
    For experienced users who want complete data.
    """
    return {
        "verdict"    : verdict,
        "score"      : score,
        "ml": {
            "confidence" : f"{confidence*100:.1f}%",
            "buy_prob"   : f"{probs['buy']*100:.1f}%",
            "hold_prob"  : f"{probs['hold']*100:.1f}%",
            "sell_prob"  : f"{probs['sell']*100:.1f}%",
        },
        "indicators" : indicators,
        "sentiment"  : sentiment,
        "all_notes"  : notes,
    }


def _error_tip(ticker: str, message: str) -> dict:
    return {
        "ticker"      : ticker,
        "verdict"     : "UNKNOWN",
        "score"       : 0,
        "risk_level"  : "Unknown",
        "entry"       : {"price": None, "rationale": message},
        "rookie_card" : {},
        "pro_card"    : {},
        "notes"       : [],
        "prediction"  : {},
        "error"       : message,
    }


if __name__ == "__main__":
    """
    python -m backend.tips.generator
    """
    tip = generate_tip("AAPL")

    print(f"\n{'='*50}")
    print(f"  VESTR TIP — {tip['ticker']}")
    print(f"{'='*50}")
    print(f"\n  Verdict:    {tip['rookie_card']['verdict']}")
    print(f"  Price:      {tip['rookie_card']['current_price']}")
    print(f"  Risk:       {tip['risk_level']}")
    print(f"  Entry:      {tip['rookie_card']['entry']}")
    print(f"\n  Why:")
    for reason in tip["rookie_card"]["key_reasons"]:
        print(f"    • {reason}")
    if tip["rookie_card"]["warnings"]:
        print(f"\n  Warnings:")
        for w in tip["rookie_card"]["warnings"]:
            print(f"    ⚠️  {w}")
    print(f"\n  {tip['rookie_card']['verdict_explanation']}")
    print(f"\n  Risk note: {tip['rookie_card']['risk_explanation']}")