from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


# ── Auth schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
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
    email    : str
    password : str


class TokenResponse(BaseModel):
    access_token : str
    token_type   : str = "bearer"
    user         : "UserResponse"


class UserResponse(BaseModel):
    id         : int
    email      : str
    username   : str
    mode       : str
    theme      : str
    created_at : datetime

    class Config:
        from_attributes = True


class UpdatePreferencesRequest(BaseModel):
    mode  : Optional[str] = None
    theme : Optional[str] = None

    @field_validator("mode")
    def mode_valid(cls, v):
        if v and v not in ("rookie", "pro"):
            raise ValueError("Mode must be rookie or pro")
        return v


# ── Stock schemas ─────────────────────────────────────────────

class TipRequest(BaseModel):
    ticker : str

    @field_validator("ticker")
    def ticker_valid(cls, v):
        v = v.upper().strip()
        if not v.isalpha() or len(v) > 5:
            raise ValueError("Invalid ticker symbol")
        return v


class BacktestRequest(BaseModel):
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
    ticker : str
    name   : Optional[str] = None

    @field_validator("ticker")
    def ticker_valid(cls, v):
        return v.upper().strip()


class WatchlistItemResponse(BaseModel):
    id       : int
    ticker   : str
    name     : Optional[str]
    added_at : datetime

    class Config:
        from_attributes = True


# ── Portfolio schemas ─────────────────────────────────────────

class PortfolioAddRequest(BaseModel):
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
    id            : int
    ticker        : str
    shares        : float
    avg_buy_price : float
    created_at    : datetime

    class Config:
        from_attributes = True


class PortfolioItemWithPnL(BaseModel):
    id            : int
    ticker        : str
    shares        : float
    avg_buy_price : float
    current_price : Optional[float]
    total_cost    : float
    current_value : Optional[float]
    pnl           : Optional[float]
    pnl_pct       : Optional[float]
    created_at    : datetime

    class Config:
        from_attributes = True


# ── Screener schemas ──────────────────────────────────────────

class ScreenerResult(BaseModel):
    ticker     : str
    verdict    : str
    score      : int
    confidence : float
    close      : float
    risk_level : Optional[str] = "Low"
    rsi        : Optional[float] = 0
    sentiment  : Optional[str] = "Neutral"


class ScreenerResponse(BaseModel):
    must_buy  : list[ScreenerResult]
    must_sell : list[ScreenerResult]


# ── Generic response schemas ──────────────────────────────────

class MessageResponse(BaseModel):
    message : str


class ErrorResponse(BaseModel):
    error  : str
    detail : Optional[str] = None