from fastapi import Cookie, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Optional
from core.security import decode_token, ACCESS_COOKIE_NAME
from db.session import get_db
from models.admin import Admin


def get_current_admin(
    db: Session = Depends(get_db),
    talenta_access_token: Optional[str] = Cookie(default=None, alias=ACCESS_COOKIE_NAME),
) -> Admin:
    """
    Dependency that reads the HttpOnly access-token cookie, validates the JWT,
    and returns the current Admin from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please log in.",
    )
    if not talenta_access_token:
        raise credentials_exception

    payload = decode_token(talenta_access_token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    admin_id: Optional[int] = payload.get("sub")
    if admin_id is None:
        raise credentials_exception

    admin = db.query(Admin).filter(Admin.id == int(admin_id)).first()
    if admin is None or not admin.is_active:
        raise credentials_exception

    return admin
