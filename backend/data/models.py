from sqlalchemy import Column, String, Float, Date, Integer, DateTime
from sqlalchemy.sql import func
from backend.data.database import Base

class StockPrice(Base):
    """
    Represents one day of price data for a stock
    Every row = one trading day for one ticker
    e.g. AAPL on 2024-01-15: open=185.00, close=187.00, etc
    """
    __tablename__ = "stock_prices"

    id         = Column(Integer, primary_key=True, index=True)
    ticker     = Column(String, nullable=False, index=True)  # e.g. "AAPL" 
    date       = Column(Date, nullable=False, index=True)    # e.g. 2024-01-15
    open       = Column(Float, nullable=False)               # price at market open
    high       = Column(Float, nullable=False)               # highest price that day
    low        = Column(Float, nullable=False)               # lowest price that day
    close      = Column(Float, nullable=False)               # price at market close
    volume     = Column(Float, nullable=False)               # shares traded that day
    created_at = Column(DateTime, server_default=func.now()) # when we stored this row

    def __repr__(self):
        return f"<StockPrice {self.ticker} {self.date} close={self.close}>"


class Watchlist(Base):
    """
    Stores the tickers the user is actively watching
    e.g. if you add AAPL to your watchlist, it lives here
    """
    __tablename__ = "watchlist"

    id         = Column(Integer, primary_key=True, index=True)
    ticker     = Column(String, nullable=False, unique=True) # no duplicate tickers
    name       = Column(String, nullable=True)               # e.g. "Apple Inc."
    added_at   = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Watchlist {self.ticker}>"