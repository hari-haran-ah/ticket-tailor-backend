from fastapi import APIRouter, Depends, HTTPException, Response, status, Cookie
from sqlalchemy.orm import Session
from typing import Optional

from core.deps import get_current_admin
from core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    set_auth_cookies,
    clear_auth_cookies,
    REFRESH_COOKIE_NAME,
)
from db.session import get_db
from models.admin import Admin
from schemas.token import LoginRequest
from schemas.admin import AdminOut

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Admin login — sets HttpOnly JWT cookies on success."""
    admin = db.query(Admin).filter(Admin.email == payload.email).first()
    if not admin or not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    access_token = create_access_token({"sub": str(admin.id)})
    refresh_token = create_refresh_token({"sub": str(admin.id)})
    set_auth_cookies(response, access_token, refresh_token)

    return {"message": "Login successful", "admin": AdminOut.model_validate(admin)}


@router.post("/refresh")
def refresh_token(
    response: Response,
    db: Session = Depends(get_db),
    talenta_refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
):
    """Issue a new access token using the refresh cookie."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
    )
    if not talenta_refresh_token:
        raise credentials_exception

    payload = decode_token(talenta_refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise credentials_exception

    admin = db.query(Admin).filter(Admin.id == int(payload["sub"])).first()
    if not admin or not admin.is_active:
        raise credentials_exception

    new_access = create_access_token({"sub": str(admin.id)})
    new_refresh = create_refresh_token({"sub": str(admin.id)})
    set_auth_cookies(response, new_access, new_refresh)
    return {"message": "Token refreshed"}


@router.post("/logout")
def logout(response: Response, _: Admin = Depends(get_current_admin)):
    """Clear auth cookies."""
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AdminOut)
def get_me(current_admin: Admin = Depends(get_current_admin)):
    """Return the currently authenticated admin."""
    return current_admin
