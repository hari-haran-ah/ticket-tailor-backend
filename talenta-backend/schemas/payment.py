from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class CheckoutItem(BaseModel):
    ticket_type_id: str
    quantity: int

class CheckoutRequest(BaseModel):
    event_id: str
    items: List[CheckoutItem]
    customer_email: EmailStr
    customer_name: str
    customer_phone: str

class CheckoutResponse(BaseModel):
    session_id: str
    url: str

class PaymentOut(BaseModel):
    id: int
    stripe_session_id: str
    stripe_payment_intent_id: Optional[str]
    client_id: int
    client_name: str
    stripe_account_id: str
    event_id: str
    event_name: str
    ticket_type_id: str
    ticket_type_name: str
    quantity: int
    unit_amount_cents: int
    total_amount_cents: int
    currency: str
    customer_email: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    status: str
    created_at: datetime
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True
