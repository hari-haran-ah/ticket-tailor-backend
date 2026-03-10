from fastapi import Cookie, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Optional
from core.security import decode_token, ACCESS_COOKIE_NAME
from db.session import get_db
from models.admin import Admin


import logging

logger = logging.getLogger(__name__)

def get_current_admin(
    db: Session = Depends(get_db),
    talenta_access_token: Optional[str] = Cookie(default=None, alias=ACCESS_COOKIE_NAME),
) -> Admin:
    """
    Dependency that reads the HttpOnly access-token cookie, validates the JWT,
    and returns the current Admin from the database.
    """
    if not talenta_access_token:
        logger.warning(f"AUTHENTICATION FAILED: Missing cookie '{ACCESS_COOKIE_NAME}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
        )

    payload = decode_token(talenta_access_token)
    if payload is None:
        logger.error("AUTHENTICATION FAILED: Invalid or expired JWT token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    if payload.get("type") != "access":
        logger.error(f"AUTHENTICATION FAILED: Wrong token type: {payload.get('type')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    admin_id: Optional[str] = payload.get("sub")
    if admin_id is None:
        logger.error("AUTHENTICATION FAILED: Token payload missing 'sub'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token",
        )

    admin = db.query(Admin).filter(Admin.id == int(admin_id)).first()
    if admin is None:
        logger.error(f"AUTHENTICATION FAILED: Admin with ID {admin_id} not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
        
    if not admin.is_active:
        logger.warning(f"AUTHENTICATION FAILED: Admin ID {admin_id} is inactive")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account disabled",
        )

    logger.info(f"AUTHENTICATION SUCCESS: Admin {admin.email} (ID: {admin.id})")
    return admin

