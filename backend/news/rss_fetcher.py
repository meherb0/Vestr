import feedparser
import re
from datetime import datetime, timezone
from typing import Optional

RSS_SOURCES = {
    "yahoo_finance" : "https://finance.yahoo.com/rss/headline?s={ticker}",
    "seeking_alpha" : "https://seekingalpha.com/api/sa/combined/{ticker}.xml",
}

GENERAL_FEEDS = [
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://feeds.marketwatch.com/marketwatch/topstories/",
]

# Mimic a real browser so Railway servers don't get blocked
REQUEST_HEADERS = {
    'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept'         : 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control'  : 'no-cache',
}


def _clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _parse_published_date(entry) -> Optional[datetime]:
    try:
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    except Exception:
        pass
    return None


def fetch_ticker_news(ticker: str, max_articles: int = 20) -> list[dict]:
    ticker  = ticker.upper().strip()
    results = []

    for source_name, url_template in RSS_SOURCES.items():
        url = url_template.format(ticker=ticker)
        try:
            feed = feedparser.parse(url, request_headers=REQUEST_HEADERS)
        except Exception:
            continue

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

    results.sort(
        key=lambda x: x["published_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )
    return results[:max_articles]


def fetch_general_market_news(max_articles: int = 10) -> list[dict]:
    results = []
    for url in GENERAL_FEEDS:
        try:
            feed = feedparser.parse(url, request_headers=REQUEST_HEADERS)
        except Exception:
            continue
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