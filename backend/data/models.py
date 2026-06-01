from sqlalchemy import Column, String, Float, Date, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.data.database import Base


class StockPrice(Base):
    """
    One row = one trading day for one ticker
    e.g. AAPL on 2024-01-15: open=185.00, close=187.00 etc
    """
    __tablename__ = "stock_prices"

    id         = Column(Integer, primary_key=True, index=True)
    ticker     = Column(String, nullable=False, index=True)
    date       = Column(Date, nullable=False, index=True)
    open       = Column(Float, nullable=False)
    high       = Column(Float, nullable=False)
    low        = Column(Float, nullable=False)
    close      = Column(Float, nullable=False)
    volume     = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<StockPrice {self.ticker} {self.date} close={self.close}>"


class User(Base):
    """
    Registered user account.
    Stores credentials and personalisation preferences.
    password_hash — we NEVER store plain text passwords,
    always a bcrypt hash.
    """
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, nullable=False, unique=True, index=True)
    username      = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    mode          = Column(String, default="rookie")   # "rookie" or "pro"
    theme         = Column(String, default="dark")     # "dark", "light", "system"
    layout        = Column(String, default="classic")  # "classic", "trader", "minimal"
    created_at    = Column(DateTime, server_default=func.now())
    is_active     = Column(Boolean, default=True)

    # Relationships — lets us do user.watchlist, user.portfolio
    watchlist  = relationship("WatchlistItem",  back_populates="user", cascade="all, delete")
    portfolio  = relationship("PortfolioItem",  back_populates="user", cascade="all, delete")

    def __repr__(self):
        return f"<User {self.username} ({self.email})>"


class WatchlistItem(Base):
    """
    A stock a user is tracking but hasn't invested in yet.
    One row per ticker per user.
    """
    __tablename__ = "watchlist"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ticker     = Column(String, nullable=False)
    name       = Column(String, nullable=True)   # e.g. "Apple Inc."
    added_at   = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="watchlist")

    def __repr__(self):
        return f"<WatchlistItem {self.ticker} user={self.user_id}>"


class PortfolioItem(Base):
    """
    A stock the user actually owns.
    Tracks how many shares and at what price they bought.
    This lets us calculate their current P&L in real time.

    P&L = (current price - avg_buy_price) * shares
    """
    __tablename__ = "portfolio"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ticker        = Column(String, nullable=False)
    name          = Column(String, nullable=True)
    shares        = Column(Float, nullable=False)
    avg_buy_price = Column(Float, nullable=False)  # average price paid per share
    added_at      = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="portfolio")

    def __repr__(self):
        return f"<PortfolioItem {self.ticker} shares={self.shares} user={self.user_id}>"