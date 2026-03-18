from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    # Structural guard: prevents duplicate webhook processing even under race conditions.
    # If Stripe fires the same webhook twice simultaneously, the second insert will hit
    # this constraint and raise an IntegrityError, which the webhook handler catches safely.
    __table_args__ = (
        UniqueConstraint("stripe_session_id", "ticket_type_id", name="uq_payment_session_ticket"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stripe_session_id = Column(String, index=True, nullable=False)
    stripe_payment_intent_id = Column(String, index=True, nullable=True)
    
    # Store essential data independent of TT API drops
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    client_name = Column(String, nullable=False)
    stripe_account_id = Column(String, nullable=False)

    event_id = Column(String, nullable=False, index=True)
    event_name = Column(String, nullable=False)
    ticket_type_id = Column(String, nullable=False)
    ticket_type_name = Column(String, nullable=False)

    quantity = Column(Integer, nullable=False)
    unit_amount_cents = Column(Integer, nullable=False)
    total_amount_cents = Column(Integer, nullable=False)
    platform_fee_cents = Column(Integer, nullable=False, default=0)  # Platform earnings from this payment
    currency = Column(String, nullable=False, default="usd")

    customer_email = Column(String, nullable=False)
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)

    status = Column(String, nullable=False, default="pending") # pending, complete, failed
    tt_ticket_id = Column(String, nullable=True) # Linked Ticket Tailor ticket ID
    tt_error = Column(String, nullable=True) # Any API error during issuance
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    client = relationship("Client", backref="payments")
