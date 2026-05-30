from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from backend.news.rss_fetcher import fetch_ticker_news
from datetime import datetime, timezone

# Initialise VADER once — expensive to create, reuse everywhere
analyser = SentimentIntensityAnalyzer()


def analyse_headline(headline: str) -> dict:
    """
    Runs VADER sentiment analysis on a single headline.

    VADER returns 4 scores:
        neg      → how negative (0 to 1)
        neu      → how neutral  (0 to 1)
        pos      → how positive (0 to 1)
        compound → overall score (-1 to +1) ← this is what we use

    Compound score thresholds:
        >= 0.05  → Bullish
        <= -0.05 → Bearish
        between  → Neutral
    """
    scores   = analyser.polarity_scores(headline)
    compound = scores["compound"]

    if compound >= 0.05:
        label = "Bullish"
    elif compound <= -0.05:
        label = "Bearish"
    else:
        label = "Neutral"

    return {
        "headline" : headline,
        "compound" : round(compound, 4),
        "label"    : label,
        "pos"      : round(scores["pos"], 4),
        "neg"      : round(scores["neg"], 4),
        "neu"      : round(scores["neu"], 4),
    }


def analyse_ticker_sentiment(ticker: str, max_articles: int = 20) -> dict:
    """
    Fetches recent news for a ticker and runs sentiment analysis
    on every headline. Returns an overall sentiment summary.

    The overall compound score is a weighted average — more recent
    articles are weighted more heavily since they're more relevant
    to the current price.

    Args:
        ticker: stock symbol e.g. "AAPL"
        max_articles: how many headlines to analyse

    Returns:
        dict with:
            ticker          → the stock symbol
            overall_score   → weighted average compound score (-1 to +1)
            overall_label   → Bullish / Bearish / Neutral
            bullish_pct     → % of headlines that were bullish
            bearish_pct     → % of headlines that were bearish
            neutral_pct     → % of headlines that were neutral
            article_count   → how many headlines were analysed
            articles        → list of individual headline results
            summary         → plain English summary string
    """
    ticker   = ticker.upper().strip()
    articles = fetch_ticker_news(ticker, max_articles=max_articles)

    if not articles:
        return {
            "ticker"        : ticker,
            "overall_score" : 0.0,
            "overall_label" : "Neutral",
            "bullish_pct"   : 0.0,
            "bearish_pct"   : 0.0,
            "neutral_pct"   : 0.0,
            "article_count" : 0,
            "articles"      : [],
            "summary"       : "No recent news found.",
        }

    # Analyse every headline
    analysed = []
    for article in articles:
        result = analyse_headline(article["title"])
        result["source"]       = article["source"]
        result["published_at"] = article["published_at"]
        result["url"]          = article["url"]
        analysed.append(result)

    # Weighted average — articles at index 0 (most recent) weighted highest
    # Weight formula: (n - index) / sum of all weights
    n            = len(analysed)
    weights      = [n - i for i in range(n)]
    total_weight = sum(weights)

    weighted_score = sum(
        a["compound"] * w
        for a, w in zip(analysed, weights)
    ) / total_weight

    weighted_score = round(weighted_score, 4)

    # Count labels
    labels       = [a["label"] for a in analysed]
    bullish_pct  = round(labels.count("Bullish") / n * 100, 1)
    bearish_pct  = round(labels.count("Bearish") / n * 100, 1)
    neutral_pct  = round(labels.count("Neutral") / n * 100, 1)

    # Overall label from weighted score
    if weighted_score >= 0.05:
        overall_label = "Bullish"
    elif weighted_score <= -0.05:
        overall_label = "Bearish"
    else:
        overall_label = "Neutral"

    # Plain English summary
    summary = _build_summary(ticker, overall_label, weighted_score, bullish_pct, bearish_pct, n)

    return {
        "ticker"        : ticker,
        "overall_score" : weighted_score,
        "overall_label" : overall_label,
        "bullish_pct"   : bullish_pct,
        "bearish_pct"   : bearish_pct,
        "neutral_pct"   : neutral_pct,
        "article_count" : n,
        "articles"      : analysed,
        "summary"       : summary,
    }


def _build_summary(
    ticker: str,
    label: str,
    score: float,
    bullish_pct: float,
    bearish_pct: float,
    n: int
) -> str:
    """
    Builds a plain English summary of the news sentiment.
    This is what gets shown to the user in the tip card.
    """
    strength = (
        "strongly" if abs(score) > 0.3 else
        "moderately" if abs(score) > 0.15 else
        "slightly"
    )

    if label == "Bullish":
        return (
            f"Recent news around {ticker} is {strength} positive — "
            f"{bullish_pct}% of {n} headlines are bullish. "
            f"Market sentiment is supportive of a price rise."
        )
    elif label == "Bearish":
        return (
            f"Recent news around {ticker} is {strength} negative — "
            f"{bearish_pct}% of {n} headlines are bearish. "
            f"Market sentiment suggests caution."
        )
    else:
        return (
            f"Recent news around {ticker} is mixed — "
            f"{bullish_pct}% bullish, {bearish_pct}% bearish across {n} headlines. "
            f"No strong directional signal from news."
        )


if __name__ == "__main__":
    """
    Quick test — run this to see live sentiment for AAPL
    python -m backend.news.sentiment
    """
    result = analyse_ticker_sentiment("AAPL")

    print(f"\n[Vestr] Sentiment Analysis — {result['ticker']}")
    print(f"  Overall:     {result['overall_label']} ({result['overall_score']})")
    print(f"  Bullish:     {result['bullish_pct']}%")
    print(f"  Bearish:     {result['bearish_pct']}%")
    print(f"  Neutral:     {result['neutral_pct']}%")
    print(f"  Articles:    {result['article_count']}")
    print(f"\n  Summary: {result['summary']}")
    print(f"\n  Headlines:")
    for a in result["articles"][:5]:
        print(f"    [{a['label']:7}] {a['headline'][:80]}")