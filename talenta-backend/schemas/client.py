from pydantic import BaseModel, EmailStr, field_validator
import re
from typing import Optional
from datetime import datetime
from decimal import Decimal


class ClientBase(BaseModel):
    name: str
    domain_name: str
    tt_api_key: str
    stripe_account_id: Optional[str] = None
    platform_fee: Decimal = Decimal("0.00")
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9 \-]+$", v):
            raise ValueError("Client name must be alphanumeric (letters, numbers, spaces, and hyphens)")
        return v

    @field_validator("domain_name")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("Domain name must start with http:// or https://")
        return v

    @field_validator("tt_api_key")
    @classmethod
    def validate_tt_api_key(cls, v: str) -> str:
        if not v.startswith("sk_"):
            raise ValueError("TT API Key must start with 'sk_'")
        return v

    @field_validator("stripe_account_id")
    @classmethod
    def validate_stripe_id(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith("acct_"):
            raise ValueError("Stripe Account ID must start with 'acct_'")
        return v

    @field_validator("platform_fee")
    @classmethod
    def validate_fee(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise ValueError("Platform fee must be between 0 and 100")
        return v

    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v:
            digits_only = re.sub(r"\D", "", v)
            if not (10 <= len(digits_only) <= 12):
                raise ValueError("Contact phone must contain 10 to 12 numbers")
            return digits_only
        return v


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    domain_name: Optional[str] = None
    tt_api_key: Optional[str] = None
    stripe_account_id: Optional[str] = None
    platform_fee: Optional[Decimal] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class ClientOut(ClientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
