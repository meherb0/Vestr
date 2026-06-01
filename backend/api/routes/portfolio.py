from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.data.database import get_db
from backend.data.models import User, PortfolioItem
from backend.api.schemas import (
    PortfolioAddRequest,
    PortfolioItemResponse,
    PortfolioItemWithPnL,
    MessageResponse,
)
from backend.api.auth import get_current_user
from backend.data.fetcher import get_prices, fetch_and_store

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def _enrich_with_pnl(item: PortfolioItem, db: Session) -> dict:
    """
    Takes a portfolio item and adds live P&L calculations.

    P&L (Profit and Loss):
        total_cost    = shares × avg_buy_price
        current_value = shares × current_price
        pnl           = current_value - total_cost
        pnl_pct       = pnl / total_cost × 100

    If price data isn't available, returns None for price fields
    rather than crashing.
    """
    fetch_and_store(item.ticker, db, period_years=1)
    df = get_prices(item.ticker, db)

    current_price  = None
    current_value  = None
    pnl            = None
    pnl_pct        = None

    if not df.empty:
        current_price = round(float(df["close"].iloc[-1]), 2)
        current_value = round(current_price * item.shares, 2)
        total_cost    = round(item.avg_buy_price * item.shares, 2)
        pnl           = round(current_value - total_cost, 2)
        pnl_pct       = round((pnl / total_cost) * 100, 2) if total_cost > 0 else 0.0

    return {
        "id"            : item.id,
        "ticker"        : item.ticker,
        "name"          : item.name,
        "shares"        : item.shares,
        "avg_buy_price" : item.avg_buy_price,
        "current_price" : current_price,
        "total_cost"    : round(item.avg_buy_price * item.shares, 2),
        "current_value" : current_value,
        "pnl"           : pnl,
        "pnl_pct"       : pnl_pct,
        "added_at"      : item.added_at,
    }


@router.get("/", response_model=list[PortfolioItemWithPnL])
def get_portfolio(
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Returns all stocks the user owns with live P&L for each.

    For each item:
        - fetches latest price from database
        - calculates current value vs what they paid
        - returns gain/loss in dollars and percentage
    """
    items = (
        db.query(PortfolioItem)
          .filter(PortfolioItem.user_id == current_user.id)
          .order_by(PortfolioItem.added_at.desc())
          .all()
    )

    return [_enrich_with_pnl(item, db) for item in items]


@router.get("/summary")
def get_portfolio_summary(
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Returns aggregated portfolio stats — total value,
    total cost, overall P&L across all holdings.

    Used by the dashboard widget at the top of the page.
    """
    items = (
        db.query(PortfolioItem)
          .filter(PortfolioItem.user_id == current_user.id)
          .all()
    )

    if not items:
        return {
            "total_cost"          : 0.0,
            "total_current_value" : 0.0,
            "total_pnl"           : 0.0,
            "total_pnl_pct"       : 0.0,
            "holdings_count"      : 0,
        }

    enriched       = [_enrich_with_pnl(item, db) for item in items]
    total_cost     = sum(e["total_cost"]    for e in enriched)
    total_value    = sum(e["current_value"] for e in enriched if e["current_value"])
    total_pnl      = round(total_value - total_cost, 2)
    total_pnl_pct  = round((total_pnl / total_cost) * 100, 2) if total_cost > 0 else 0.0

    return {
        "total_cost"          : round(total_cost,  2),
        "total_current_value" : round(total_value, 2),
        "total_pnl"           : total_pnl,
        "total_pnl_pct"       : total_pnl_pct,
        "holdings_count"      : len(items),
    }


@router.post("/", response_model=PortfolioItemResponse, status_code=201)
def add_to_portfolio(
    req          : PortfolioAddRequest,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Adds a stock the user owns to their portfolio tracker.

    If the ticker already exists in their portfolio,
    we update the position using weighted average price
    instead of creating a duplicate entry.

    Weighted average:
        new_avg = (existing_shares × existing_price + new_shares × new_price)
                  / (existing_shares + new_shares)

    e.g. bought 10 AAPL at $200, then 5 more at $230:
         new_avg = (10×200 + 5×230) / 15 = $210
    """
    existing = (
        db.query(PortfolioItem)
          .filter(
              PortfolioItem.user_id == current_user.id,
              PortfolioItem.ticker  == req.ticker,
          )
          .first()
    )

    if existing:
        # Update position with weighted average price
        total_shares        = existing.shares + req.shares
        weighted_avg        = (
            (existing.shares * existing.avg_buy_price) +
            (req.shares      * req.avg_buy_price)
        ) / total_shares

        existing.shares        = round(total_shares, 6)
        existing.avg_buy_price = round(weighted_avg, 4)
        existing.name          = req.name or existing.name

        db.commit()
        db.refresh(existing)
        return existing

    item = PortfolioItem(
        user_id       = current_user.id,
        ticker        = req.ticker,
        name          = req.name,
        shares        = req.shares,
        avg_buy_price = req.avg_buy_price,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{ticker}", response_model=PortfolioItemResponse)
def update_position(
    ticker       : str,
    req          : PortfolioAddRequest,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Fully replaces a portfolio position.
    Used when the user wants to manually correct their shares or price.
    """
    ticker = ticker.upper().strip()

    item = (
        db.query(PortfolioItem)
          .filter(
              PortfolioItem.user_id == current_user.id,
              PortfolioItem.ticker  == ticker,
          )
          .first()
    )

    if not item:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"{ticker} not found in your portfolio."
        )

    item.shares        = req.shares
    item.avg_buy_price = req.avg_buy_price
    item.name          = req.name or item.name

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{ticker}", response_model=MessageResponse)
def remove_from_portfolio(
    ticker       : str,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Removes a position from the portfolio entirely.
    Used when user has sold all their shares.
    """
    ticker = ticker.upper().strip()

    item = (
        db.query(PortfolioItem)
          .filter(
              PortfolioItem.user_id == current_user.id,
              PortfolioItem.ticker  == ticker,
          )
          .first()
    )

    if not item:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"{ticker} not found in your portfolio."
        )

    db.delete(item)
    db.commit()
    return MessageResponse(message=f"{ticker} removed from portfolio.")