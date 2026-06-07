from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.data.database import Base


class User(Base):
    __tablename__   = "users"
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, nullable=False)
    username        = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    mode            = Column(String, default="rookie")
    theme           = Column(String, default="blueprint")
    created_at      = Column(DateTime, server_default=func.now())


class StockPrice(Base):
    __tablename__ = "stock_prices"
    id     = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    date   = Column(Date, nullable=False)
    open   = Column(Float)
    high   = Column(Float)
    low    = Column(Float)
    close  = Column(Float)
    volume = Column(Integer)


class WatchlistItem(Base):
    __tablename__ = "watchlist"
    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker   = Column(String, nullable=False)
    name     = Column(String, nullable=True)
    added_at = Column(DateTime, server_default=func.now())
    user     = relationship("User", backref="watchlist")


class PortfolioItem(Base):
    __tablename__ = "portfolio"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker        = Column(String, nullable=False)
    shares        = Column(Float, nullable=False)
    avg_buy_price = Column(Float, nullable=False)
    created_at    = Column(DateTime, server_default=func.now())
    user          = relationship("User", backref="portfolio")


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker       = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    direction    = Column(String, nullable=False)   # "above" or "below"
    note         = Column(String, nullable=True, default="")
    triggered    = Column(Boolean, default=False)
    created_at   = Column(DateTime, server_default=func.now())
    user         = relationship("User", backref="alerts")