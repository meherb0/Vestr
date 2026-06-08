import re
from datetime import datetime, timezone
from typing import Optional

RSS_SOURCES = {
    "yahoo_finance": "https://finance.yahoo.com/rss/headline?s={ticker}",
    "seeking_alpha": "https://seekingalpha.com/api/sa/combined/{ticker}.xml",
}

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


def _parse_date(entry) -> Optional[datetime]:
    try:
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    except Exception:
        pass
    return None


def _fetch_yfinance_news(ticker: str) -> list[dict]:
    """Use yfinance built-in news as primary source — works reliably on servers."""
    try:
        import yfinance as yf
        stock   = yf.Ticker(ticker)
        news    = stock.news or []
        results = []
        for item in news[:20]:
            content  = item.get('content', {})
            title    = content.get('title', '') or item.get('title', '')
            title    = _clean_text(title)
            if not title:
                continue
            pub_date = None
            try:
                ts = content.get('pubDate') or item.get('providerPublishTime')
                if isinstance(ts, str):
                    pub_date = datetime.fromisoformat(ts.replace('Z','+00:00'))
                elif isinstance(ts, (int, float)):
                    pub_date = datetime.fromtimestamp(ts, tz=timezone.utc)
            except Exception:
                pass
            url = ''
            try:
                url = (content.get('canonicalUrl', {}) or {}).get('url', '') or \
                      item.get('link', '') or ''
            except Exception:
                pass
            results.append({
                'title'       : title,
                'source'      : 'yahoo_finance',
                'published_at': pub_date,
                'url'         : url,
            })
        return results
    except Exception:
        return []


def _fetch_rss_news(ticker: str, max_articles: int = 20) -> list[dict]:
    """RSS fallback with browser headers."""
    try:
        import feedparser
        results = []
        for source_name, url_template in RSS_SOURCES.items():
            url = url_template.format(ticker=ticker)
            try:
                feed = feedparser.parse(url, request_headers=REQUEST_HEADERS)
                for entry in feed.entries:
                    title = _clean_text(getattr(entry, "title", ""))
                    if not title:
                        continue
                    results.append({
                        'title'       : title,
                        'source'      : source_name,
                        'published_at': _parse_date(entry),
                        'url'         : getattr(entry, "link", ""),
                    })
                    if len(results) >= max_articles:
                        break
            except Exception:
                continue
        return results
    except Exception:
        return []


def fetch_ticker_news(ticker: str, max_articles: int = 20) -> list[dict]:
    ticker = ticker.upper().strip()

    # Try yfinance news first (most reliable on cloud servers)
    results = _fetch_yfinance_news(ticker)

    # Fall back to RSS if yfinance returns nothing
    if not results:
        results = _fetch_rss_news(ticker, max_articles)

    results.sort(
        key=lambda x: x['published_at'] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )
    return results[:max_articles]


def fetch_general_market_news(max_articles: int = 10) -> list[dict]:
    general_feeds = [
        "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC",
        "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    ]
    results = []
    try:
        import feedparser
        for url in general_feeds:
            try:
                feed = feedparser.parse(url, request_headers=REQUEST_HEADERS)
                for entry in feed.entries:
                    title = _clean_text(getattr(entry, "title", ""))
                    if not title:
                        continue
                    results.append({
                        'title'       : title,
                        'source'      : url,
                        'published_at': _parse_date(entry),
                        'url'         : getattr(entry, "link", ""),
                    })
            except Exception:
                continue
    except Exception:
        pass
    results.sort(
        key=lambda x: x['published_at'] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )
    return results[:max_articles]