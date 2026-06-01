from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.data.database import get_db
from backend.data.models import User
from backend.api.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    UpdatePreferencesRequest,
    MessageResponse,
)
from backend.api.auth import (
    authenticate_user,
    create_user,
    create_token,
    get_current_user,
    get_user_by_email,
    get_user_by_username,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Creates a new user account.

    Checks:
        - Email not already registered
        - Username not already taken

    On success:
        - Creates user with hashed password
        - Returns JWT token immediately (user is logged in)
    """
    if get_user_by_email(req.email, db):
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "An account with this email already exists."
        )

    if get_user_by_username(req.username, db):
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "This username is already taken."
        )

    user  = create_user(req.email, req.username, req.password, db)
    token = create_token(user.id)

    return TokenResponse(
        access_token = token,
        user         = UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Logs in an existing user.

    Verifies email + password combination.
    Returns a fresh JWT token on success.

    We return the same error for both wrong email AND wrong password
    intentionally — telling attackers which one was wrong gives them
    information they can exploit.
    """
    user = authenticate_user(req.email, req.password, db)

    if not user:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail      = "Incorrect email or password.",
        )

    token = create_token(user.id)

    return TokenResponse(
        access_token = token,
        user         = UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently logged in user's profile.
    Frontend calls this on app load to restore session.
    """
    return current_user


@router.patch("/preferences", response_model=UserResponse)
def update_preferences(
    req          : UpdatePreferencesRequest,
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Updates user preferences — mode, theme, layout.
    Only updates fields that were actually sent.
    e.g. sending just {"theme": "light"} only changes theme.
    """
    if req.mode is not None:
        current_user.mode = req.mode
    if req.theme is not None:
        current_user.theme = req.theme
    if req.layout is not None:
        current_user.layout = req.layout

    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/account", response_model=MessageResponse)
def delete_account(
    current_user : User    = Depends(get_current_user),
    db           : Session = Depends(get_db),
):
    """
    Permanently deletes a user account and all their data.
    Cascade delete in models.py handles watchlist and portfolio.
    """
    db.delete(current_user)
    db.commit()
    return MessageResponse(message="Account deleted successfully.")