from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric
from sqlalchemy.sql import func
from db.base import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    domain_name = Column(String, unique=True, nullable=False, index=True)
    tt_api_key = Column(String, nullable=False)          # TicketTailor API key
    stripe_account_id = Column(String, nullable=True)   # Stripe Connect account ID (acct_...)
    platform_fee = Column(Numeric(10, 2), nullable=False, default=0.00)  # % or flat fee
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
