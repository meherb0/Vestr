import re
from datetime import datetime, timezone
from typing import Optional

REQUEST_HEADERS = {
    'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept'         : 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
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

def _yfinance_news(ticker: str) -> list[dict]:
    try:
        import yfinance as yf
        stock   = yf.Ticker(ticker)
        raw     = stock.news or []
        results = []
        for item in raw:
            # Handle both old and new yfinance formats
            title = ''
            url   = ''
            pub   = None

            # New format: item['content']['title']
            if isinstance(item.get('content'), dict):
                content = item['content']
                title   = content.get('title', '')
                url     = (content.get('canonicalUrl') or {}).get('url', '')
                try:
                    ts = content.get('pubDate', '')
                    if ts:
                        pub = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                except Exception:
                    pass

            # Old format: item['title']
            if not title:
                title = item.get('title', '')
            if not url:
                url = item.get('link', '') or item.get('url', '')
            if pub is None:
                try:
                    ts = item.get('providerPublishTime')
                    if ts:
                        pub = datetime.fromtimestamp(float(ts), tz=timezone.utc)
                except Exception:
                    pass

            title = _clean_text(title)
            if title:
                results.append({
                    'title'       : title,
                    'source'      : 'yahoo_finance',
                    'published_at': pub,
                    'url'         : url,
                })
        return results
    except Exception:
        return []

def _rss_news(ticker: str) -> list[dict]:
    urls = [
        f"https://finance.yahoo.com/rss/headline?s={ticker}",
        f"https://seekingalpha.com/api/sa/combined/{ticker}.xml",
    ]
    results = []
    try:
        import feedparser
        for url in urls:
            try:
                feed = feedparser.parse(url, request_headers=REQUEST_HEADERS)
                for entry in feed.entries:
                    title = _clean_text(getattr(entry, 'title', ''))
                    if title:
                        results.append({
                            'title'       : title,
                            'source'      : 'rss',
                            'published_at': _parse_date(entry),
                            'url'         : getattr(entry, 'link', ''),
                        })
            except Exception:
                continue
    except Exception:
        pass
    return results

def fetch_ticker_news(ticker: str, max_articles: int = 20) -> list[dict]:
    ticker  = ticker.upper().strip()
    results = _yfinance_news(ticker)
    if len(results) < 3:
        results += _rss_news(ticker)
    # Deduplicate by title
    seen   = set()
    unique = []
    for r in results:
        if r['title'] not in seen:
            seen.add(r['title'])
            unique.append(r)
    unique.sort(
        key=lambda x: x['published_at'] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )
    return unique[:max_articles]

def fetch_general_market_news(max_articles: int = 10) -> list[dict]:
    return _rss_news('SPY')[:max_articles]