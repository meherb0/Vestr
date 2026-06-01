from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.data.database import get_db
from backend.data.models import User, WatchlistItem
from backend.api.schemas import (
    WatchlistAddRequest,
    WatchlistItemResponse,
    MessageResponse,
)
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.get("/", response_model=list[WatchlistItemResponse])
def get_watchlist(
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Returns all stocks on the current user's watchlist.
    Ordered by most recently added first.
    """
    items = (
        db.query(WatchlistItem)
          .filter(WatchlistItem.user_id == current_user.id)
          .order_by(WatchlistItem.added_at.desc())
          .all()
    )
    return items


@router.post("/", response_model=WatchlistItemResponse, status_code=201)
def add_to_watchlist(
    req          : WatchlistAddRequest,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Adds a stock to the user's watchlist.
    Rejects duplicates — same ticker can't be added twice.
    """
    # Check for duplicate
    existing = (
        db.query(WatchlistItem)
          .filter(
              WatchlistItem.user_id == current_user.id,
              WatchlistItem.ticker  == req.ticker,
          )
          .first()
    )

    if existing:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = f"{req.ticker} is already on your watchlist."
        )

    item = WatchlistItem(
        user_id = current_user.id,
        ticker  = req.ticker,
        name    = req.name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{ticker}", response_model=MessageResponse)
def remove_from_watchlist(
    ticker       : str,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Removes a stock from the user's watchlist.
    Returns 404 if ticker isn't on their watchlist.
    """
    ticker = ticker.upper().strip()

    item = (
        db.query(WatchlistItem)
          .filter(
              WatchlistItem.user_id == current_user.id,
              WatchlistItem.ticker  == ticker,
          )
          .first()
    )

    if not item:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"{ticker} is not on your watchlist."
        )

    db.delete(item)
    db.commit()
    return MessageResponse(message=f"{ticker} removed from watchlist.")


@router.get("/check/{ticker}")
def check_watchlist(
    ticker       : str,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Checks if a specific ticker is on the user's watchlist.
    Used by the frontend to show the correct Add/Remove button
    when viewing a stock page.
    """
    ticker = ticker.upper().strip()

    item = (
        db.query(WatchlistItem)
          .filter(
              WatchlistItem.user_id == current_user.id,
              WatchlistItem.ticker  == ticker,
          )
          .first()
    )

    return {"ticker": ticker, "on_watchlist": item is not None}