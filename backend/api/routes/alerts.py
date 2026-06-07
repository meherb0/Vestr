from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.data.database import get_db
from backend.data.models import User, PriceAlert
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertCreate(BaseModel):
    ticker       : str
    target_price : float
    direction    : str
    note         : str = ""


@router.get("/")
def get_alerts(
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    return db.query(PriceAlert).filter(PriceAlert.user_id == current_user.id).all()


@router.post("/", status_code=201)
def create_alert(
    req          : AlertCreate,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    if req.direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail="direction must be 'above' or 'below'")
    alert = PriceAlert(
        user_id      = current_user.id,
        ticker       = req.ticker.upper().strip(),
        target_price = req.target_price,
        direction    = req.direction,
        note         = req.note,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
def delete_alert(
    alert_id     : int,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    alert = db.query(PriceAlert).filter(
        PriceAlert.id      == alert_id,
        PriceAlert.user_id == current_user.id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}