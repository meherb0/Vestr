import feedparser
import re
from datetime import datetime, timezone
from typing import Optional


# Free RSS feeds — no API key needed, updates in real time
RSS_SOURCES = {
    "yahoo_finance" : "https://finance.yahoo.com/rss/headline?s={ticker}",
    "seeking_alpha" : "https://seekingalpha.com/api/sa/combined/{ticker}.xml",
}

# General market news feeds (not ticker specific)
GENERAL_FEEDS = [
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://feeds.marketwatch.com/marketwatch/topstories/",
]


def _clean_text(text: str) -> str:
    """Strips HTML tags and extra whitespace from headline text"""
    text = re.sub(r"<[^>]+>", "", text)   # remove HTML tags
    text = re.sub(r"\s+", " ", text)       # collapse whitespace
    return text.strip()


def _parse_published_date(entry) -> Optional[datetime]:
    """Safely extracts the published date from an RSS entry"""
    try:
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    except Exception:
        pass
    return None


def fetch_ticker_news(ticker: str, max_articles: int = 20) -> list[dict]:
    """
    Pulls recent news headlines for a specific stock ticker
    from Yahoo Finance and Seeking Alpha RSS feeds.

    Args:
        ticker: stock symbol e.g. "AAPL"
        max_articles: max headlines to return (default 20)

    Returns:
        List of dicts with keys: title, source, published_at, url
    """
    ticker  = ticker.upper().strip()
    results = []

    for source_name, url_template in RSS_SOURCES.items():
        url  = url_template.format(ticker=ticker)
        feed = feedparser.parse(url)

        for entry in feed.entries:
            title = _clean_text(getattr(entry, "title", ""))
            if not title:
                continue

            results.append({
                "title"        : title,
                "source"       : source_name,
                "published_at" : _parse_published_date(entry),
                "url"          : getattr(entry, "link", ""),
            })

            if len(results) >= max_articles:
                break

        if len(results) >= max_articles:
            break

    # Sort by date — most recent first
    results.sort(
        key=lambda x: x["published_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )

    return results[:max_articles]


def fetch_general_market_news(max_articles: int = 10) -> list[dict]:
    """
    Pulls general market news headlines (not ticker specific)
    Useful for overall market sentiment context.

    Returns:
        List of dicts with keys: title, source, published_at, url
    """
    results = []

    for url in GENERAL_FEEDS:
        feed = feedparser.parse(url)

        for entry in feed.entries:
            title = _clean_text(getattr(entry, "title", ""))
            if not title:
                continue

            results.append({
                "title"        : title,
                "source"       : url,
                "published_at" : _parse_published_date(entry),
                "url"          : getattr(entry, "link", ""),
            })

    results.sort(
        key=lambda x: x["published_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )

    return results[:max_articles]


if __name__ == "__main__":
    articles = fetch_ticker_news("AAPL")
    print(f"[Vestr] Fetched {len(articles)} headlines for AAPL\n")
    for a in articles[:5]:
        print(f"  [{a['source']}] {a['title']}")
        print(f"   → {a['published_at']}\n")