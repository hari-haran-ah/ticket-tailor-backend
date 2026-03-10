from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AdminBase(BaseModel):
    email: EmailStr
    full_name: str


class AdminCreate(AdminBase):
    password: str


class AdminOut(AdminBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
