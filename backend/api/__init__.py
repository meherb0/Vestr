from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


# ── Auth schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Data the frontend sends when a user signs up"""
    email    : EmailStr
    username : str
    password : str

    @field_validator("username")
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 30:
            raise ValueError("Username must be under 30 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, - and _")
        return v.lower()

    @field_validator("password")
    def password_valid(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    """Data the frontend sends when a user logs in"""
    email    : EmailStr
    password : str


class TokenResponse(BaseModel):
    """What we send back after successful login/register"""
    access_token : str
    token_type   : str = "bearer"
    user         : "UserResponse"


class UserResponse(BaseModel):
    """Safe user data — never includes password_hash"""
    id         : int
    email      : str
    username   : str
    mode       : str
    theme      : str
    layout     : str
    created_at : datetime

    class Config:
        from_attributes = True


class UpdatePreferencesRequest(BaseModel):
    """Frontend sends this when user changes mode/theme/layout"""
    mode   : Optional[str] = None   # "rookie" or "pro"
    theme  : Optional[str] = None   # "dark", "light", "system"
    layout : Optional[str] = None   # "classic", "trader", "minimal"

    @field_validator("mode")
    def mode_valid(cls, v):
        if v and v not in ("rookie", "pro"):
            raise ValueError("Mode must be rookie or pro")
        return v

    @field_validator("theme")
    def theme_valid(cls, v):
        if v and v not in ("dark", "light", "system"):
            raise ValueError("Theme must be dark, light or system")
        return v

    @field_validator("layout")
    def layout_valid(cls, v):
        if v and v not in ("classic", "trader", "minimal"):
            raise ValueError("Layout must be classic, trader or minimal")
        return v


# ── Stock schemas ─────────────────────────────────────────────

class TipRequest(BaseModel):
    """Frontend sends ticker when requesting a tip"""
    ticker : str

    @field_validator("ticker")
    def ticker_valid(cls, v):
        v = v.upper().strip()
        if not v.isalpha() or len(v) > 5:
            raise ValueError("Invalid ticker symbol")
        return v


class BacktestRequest(BaseModel):
    """Frontend sends this when requesting a backtest"""
    ticker        : str
    starting_cash : Optional[float] = 10000.0

    @field_validator("starting_cash")
    def cash_valid(cls, v):
        if v < 100:
            raise ValueError("Starting cash must be at least $100")
        if v > 10_000_000:
            raise ValueError("Starting cash cannot exceed $10,000,000")
        return v


# ── Watchlist schemas ─────────────────────────────────────────

class WatchlistAddRequest(BaseModel):
    """Frontend sends this when user adds a stock to watchlist"""
    ticker : str
    name   : Optional[str] = None

    @field_validator("ticker")
    def ticker_valid(cls, v):
        return v.upper().strip()


class WatchlistItemResponse(BaseModel):
    """What we send back for each watchlist item"""
    id       : int
    ticker   : str
    name     : Optional[str]
    added_at : datetime

    class Config:
        from_attributes = True


# ── Portfolio schemas ─────────────────────────────────────────

class PortfolioAddRequest(BaseModel):
    """Frontend sends this when user adds a stock they own"""
    ticker        : str
    name          : Optional[str] = None
    shares        : float
    avg_buy_price : float

    @field_validator("ticker")
    def ticker_valid(cls, v):
        return v.upper().strip()

    @field_validator("shares")
    def shares_valid(cls, v):
        if v <= 0:
            raise ValueError("Shares must be greater than 0")
        return v

    @field_validator("avg_buy_price")
    def price_valid(cls, v):
        if v <= 0:
            raise ValueError("Buy price must be greater than 0")
        return v


class PortfolioItemResponse(BaseModel):
    """What we send back for each portfolio item"""
    id            : int
    ticker        : str
    name          : Optional[str]
    shares        : float
    avg_buy_price : float
    added_at      : datetime

    class Config:
        from_attributes = True


class PortfolioItemWithPnL(BaseModel):
    """
    Portfolio item enriched with live P&L data.
    current_price and pnl are calculated at request time
    from the latest stored price data.
    """
    id              : int
    ticker          : str
    name            : Optional[str]
    shares          : float
    avg_buy_price   : float
    current_price   : Optional[float]
    total_cost      : float           # shares * avg_buy_price
    current_value   : Optional[float] # shares * current_price
    pnl             : Optional[float] # current_value - total_cost
    pnl_pct         : Optional[float] # pnl / total_cost * 100
    added_at        : datetime

    class Config:
        from_attributes = True


# ── Screener schemas ──────────────────────────────────────────

class ScreenerResult(BaseModel):
    """One stock's result from the must buy / must sell screener"""
    ticker     : str
    verdict    : str
    score      : int
    confidence : float
    close      : float


class ScreenerResponse(BaseModel):
    """Full screener response — top buys and top sells"""
    must_buy  : list[ScreenerResult]
    must_sell : list[ScreenerResult]


# ── Generic response schemas ──────────────────────────────────

class MessageResponse(BaseModel):
    """Simple success/error message response"""
    message : str


class ErrorResponse(BaseModel):
    """Standard error response shape"""
    error   : str
    detail  : Optional[str] = None