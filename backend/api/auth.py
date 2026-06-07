from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.data.database import get_db
from backend.data.models import User
import os

SECRET_KEY        = os.getenv("SECRET_KEY", "vestr-dev-secret-change-in-production")
ALGORITHM         = "HS256"
TOKEN_EXPIRE_DAYS = 30

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: int) -> str:
    expire  = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return int(user_id)
    except JWTError:
        return None


def get_current_user(
    token : str     = Depends(oauth2_scheme),
    db    : Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code = status.HTTP_401_UNAUTHORIZED,
        detail      = "Invalid or expired token. Please log in again.",
        headers     = {"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_token(token)
    if user_id is None:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_user_optional(
    token : Optional[str] = Depends(oauth2_scheme),
    db    : Session       = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    user_id = decode_token(token)
    if user_id is None:
        return None
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(email: str, db: Session) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower()).first()


def get_user_by_username(username: str, db: Session) -> Optional[User]:
    return db.query(User).filter(User.username == username.lower()).first()


def create_user(email: str, username: str, password: str, db: Session) -> User:
    user = User(
        email           = email.lower(),
        username        = username.lower(),
        hashed_password = hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(email_or_username: str, password: str, db: Session) -> Optional[User]:
    # Try email first
    user = db.query(User).filter(User.email == email_or_username.lower()).first()
    # Fall back to username
    if not user:
        user = db.query(User).filter(User.username == email_or_username.lower()).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user