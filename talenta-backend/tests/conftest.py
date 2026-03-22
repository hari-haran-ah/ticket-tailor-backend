"""
Test configuration and fixtures for Talenta Backend tests.
"""
import os
import pytest
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Set test environment before importing app
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_fake"
os.environ["ADMIN_EMAIL"] = "admin@test.com"
os.environ["ADMIN_PASSWORD"] = "TestPassword123!"
os.environ["ADMIN_FULL_NAME"] = "Test Admin"
os.environ["FRONTEND_URL"] = "http://localhost:3000"
os.environ["SMTP_EMAIL"] = ""
os.environ["SMTP_APP_PASSWORD"] = ""

from db.base import Base
from db.session import get_db
from main import app
from models.admin import Admin
from models.client import Client
from models.payment import Payment
from core.security import get_password_hash, create_access_token


# Create test engine with in-memory SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    # Create all tables
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with overridden database dependency."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_admin(db_session: Session) -> Admin:
    """Create a test admin user."""
    admin = Admin(
        email="testadmin@example.com",
        hashed_password=get_password_hash("TestPassword123!"),
        full_name="Test Admin",
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def inactive_admin(db_session: Session) -> Admin:
    """Create an inactive admin user."""
    admin = Admin(
        email="inactive@example.com",
        hashed_password=get_password_hash("TestPassword123!"),
        full_name="Inactive Admin",
        is_active=False,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def auth_headers(test_admin: Admin) -> Dict[str, str]:
    """Create authentication headers for test admin."""
    token = create_access_token({"sub": str(test_admin.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_client_entity(db_session: Session) -> Client:
    """Create a test client entity (business client, not HTTP client)."""
    client_entity = Client(
        name="Test Client Business",
        domain_name="https://testclient.example.com",
        tt_api_key="sk_test_tt_api_key_12345",
        stripe_account_id="acct_test123456",
        platform_fee=5.00,
        contact_email="contact@testclient.com",
        contact_phone="1234567890",
        address="123 Test Street",
        is_active=True,
    )
    db_session.add(client_entity)
    db_session.commit()
    db_session.refresh(client_entity)
    return client_entity


@pytest.fixture
def test_client_no_stripe(db_session: Session) -> Client:
    """Create a test client without Stripe account."""
    client_entity = Client(
        name="No Stripe Client",
        domain_name="https://nostripe.example.com",
        tt_api_key="sk_test_tt_api_key_nostripe",
        stripe_account_id=None,
        platform_fee=3.00,
        is_active=True,
    )
    db_session.add(client_entity)
    db_session.commit()
    db_session.refresh(client_entity)
    return client_entity


@pytest.fixture
def test_payment(db_session: Session, test_client_entity: Client) -> Payment:
    """Create a test payment record."""
    from datetime import datetime

    payment = Payment(
        stripe_session_id="cs_test_session_123",
        stripe_payment_intent_id="pi_test_123",
        client_id=test_client_entity.id,
        client_name=test_client_entity.name,
        stripe_account_id=test_client_entity.stripe_account_id,
        event_id="ev_test_event_123",
        event_name="Test Event",
        ticket_type_id="tt_test_ticket_123",
        ticket_type_name="General Admission",
        quantity=2,
        unit_amount_cents=1500,
        total_amount_cents=3000,
        platform_fee_cents=150,
        currency="usd",
        customer_email="customer@test.com",
        customer_name="Test Customer",
        customer_phone="+1987654321",
        status="complete",
        paid_at=datetime.utcnow()
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)
    return payment


# Test data factories
class TestDataFactory:
    """Factory for creating test data."""

    @staticmethod
    def create_client_data(overrides: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate client creation data."""
        data = {
            "name": "New Test Client",
            "domain_name": "https://newclient.example.com",
            "tt_api_key": "sk_test_new_api_key",
            "stripe_account_id": "acct_new123",
            "platform_fee": 4.50,
            "contact_email": "new@example.com",
            "contact_phone": "1111111111",
            "address": "456 New Street",
            "is_active": True,
        }
        if overrides:
            data.update(overrides)
        return data

    @staticmethod
    def create_login_data(email: str = "testadmin@example.com",
                          password: str = "TestPassword123!") -> Dict[str, str]:
        """Generate login credentials."""
        return {"email": email, "password": password}


@pytest.fixture
def test_data_factory() -> TestDataFactory:
    """Provide test data factory."""
    return TestDataFactory()
