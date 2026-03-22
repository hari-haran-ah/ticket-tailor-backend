"""
Integration tests for checkout API endpoints (api/checkout.py).
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


class TestCheckoutSessionEndpoint:
    """Tests for POST /api/site/checkout/session endpoint."""

    @pytest.mark.integration
    def test_checkout_missing_stripe_account(self, client: TestClient, test_client_no_stripe, db_session):
        """Should reject checkout when client has no Stripe account."""
        response = client.post(
            "/api/site/checkout/session",
            json={
                "event_id": "ev_123",
                "items": [{"ticket_type_id": "tt_123", "quantity": 1}],
                "customer_email": "customer@test.com",
                "customer_name": "Test Customer",
                "customer_phone": "1234567890"
            },
            headers={"X-Client-ID": str(test_client_no_stripe.id)}
        )

        assert response.status_code == 400
        assert "Missing Stripe Account" in response.json()["detail"]

    @pytest.mark.integration
    @patch('api.checkout._tt_get')
    @patch('stripe.checkout.Session.create')
    def test_checkout_session_success(
            self, mock_stripe_create, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should create checkout session successfully."""
        mock_tt_get.return_value = {
            "id": "ev_123",
            "name": "Test Event",
            "ticket_types": [
                {
                    "id": "tt_123",
                    "name": "General Admission",
                    "price": 1500,
                    "status": "on_sale",
                    "quantity": 100,
                    "quantity_sold": 10,
                    "quantity_available": 90
                }
            ]
        }

        mock_stripe_create.return_value = MagicMock(
            id="cs_test_session_id",
            url="https://checkout.stripe.com/pay/cs_test_session_id"
        )

        response = client.post(
            "/api/site/checkout/session",
            json={
                "event_id": "ev_123",
                "items": [{"ticket_type_id": "tt_123", "quantity": 2}],
                "customer_email": "customer@test.com",
                "customer_name": "Test Customer",
                "customer_phone": "1234567890"
            },
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "url" in data

    @pytest.mark.integration
    @patch('api.checkout._tt_get')
    def test_checkout_ticket_not_found(
            self, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should reject checkout with non-existent ticket type."""
        mock_tt_get.return_value = {
            "id": "ev_123",
            "name": "Test Event",
            "ticket_types": []
        }

        response = client.post(
            "/api/site/checkout/session",
            json={
                "event_id": "ev_123",
                "items": [{"ticket_type_id": "tt_nonexistent", "quantity": 1}],
                "customer_email": "customer@test.com",
                "customer_name": "Test Customer",
                "customer_phone": "1234567890"
            },
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 404
        assert "Ticket type not found" in response.json()["detail"]

    @pytest.mark.integration
    @patch('api.checkout._tt_get')
    def test_checkout_exceeds_max_quantity(
            self, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should reject checkout with more than 10 tickets per type."""
        mock_tt_get.return_value = {
            "id": "ev_123",
            "name": "Test Event",
            "ticket_types": [
                {
                    "id": "tt_123",
                    "name": "General Admission",
                    "price": 1500,
                    "status": "on_sale",
                    "quantity": 100,
                    "quantity_available": 90
                }
            ]
        }

        response = client.post(
            "/api/site/checkout/session",
            json={
                "event_id": "ev_123",
                "items": [{"ticket_type_id": "tt_123", "quantity": 15}],
                "customer_email": "customer@test.com",
                "customer_name": "Test Customer",
                "customer_phone": "1234567890"
            },
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 400
        assert "Maximum 10 tickets" in response.json()["detail"]

    @pytest.mark.integration
    @patch('api.checkout._tt_get')
    def test_checkout_insufficient_availability(
            self, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should reject checkout when not enough tickets available."""
        mock_tt_get.return_value = {
            "id": "ev_123",
            "name": "Test Event",
            "ticket_types": [
                {
                    "id": "tt_123",
                    "name": "General Admission",
                    "price": 1500,
                    "status": "on_sale",
                    "quantity": 100,
                    "quantity_sold": 98,
                    "quantity_available": 2
                }
            ]
        }

        response = client.post(
            "/api/site/checkout/session",
            json={
                "event_id": "ev_123",
                "items": [{"ticket_type_id": "tt_123", "quantity": 5}],
                "customer_email": "customer@test.com",
                "customer_name": "Test Customer",
                "customer_phone": "1234567890"
            },
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 400
        assert "Only 2 tickets left" in response.json()["detail"]

    @pytest.mark.integration
    @patch('api.checkout._tt_get')
    def test_checkout_no_items(self, mock_tt_get, client: TestClient, test_client_entity, db_session):
        """Should reject checkout with no items."""
        mock_tt_get.return_value = {
            "id": "ev_123",
            "name": "Test Event",
            "ticket_types": []
        }

        response = client.post(
            "/api/site/checkout/session",
            json={
                "event_id": "ev_123",
                "items": [],
                "customer_email": "customer@test.com",
                "customer_name": "Test Customer",
                "customer_phone": "1234567890"
            },
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 400
        assert "No tickets selected" in response.json()["detail"]


class TestCheckoutSessionStatusEndpoint:
    """Tests for GET /api/site/checkout/session/{session_id} endpoint."""

    @pytest.mark.integration
    def test_get_session_status_complete(self, client: TestClient, test_payment, db_session):
        """Should return complete status for completed payment."""
        response = client.get(
            f"/api/site/checkout/session/{test_payment.stripe_session_id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "complete"
        assert data["session_id"] == test_payment.stripe_session_id
        assert data["event_name"] == "Test Event"
        assert data["ticket_count"] == 2

    @pytest.mark.integration
    @patch('stripe.checkout.Session.retrieve')
    def test_get_session_status_pending(self, mock_stripe_retrieve, client: TestClient, db_session):
        """Should return pending status when payment not yet processed."""
        mock_stripe_retrieve.return_value = {
            "id": "cs_test_pending",
            "payment_status": "unpaid",
            "status": "open",
            "metadata": {
                "event_name": "Pending Event",
                "customer_name": "John Doe",
                "payments_data": '[{"total_amount_cents": 1500, "quantity": 1}]'
            }
        }

        response = client.get("/api/site/checkout/session/cs_test_pending")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"

    @pytest.mark.integration
    @patch('stripe.checkout.Session.retrieve')
    def test_get_session_status_expired(self, mock_stripe_retrieve, client: TestClient, db_session):
        """Should return expired status for expired sessions."""
        mock_stripe_retrieve.return_value = {
            "id": "cs_test_expired",
            "payment_status": "unpaid",
            "status": "expired"
        }

        response = client.get("/api/site/checkout/session/cs_test_expired")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"
        assert "expired" in data.get("tt_error", "").lower()


class TestStripeWebhook:
    """Tests for POST /api/site/checkout/webhook endpoint."""

    @pytest.mark.integration
    def test_webhook_invalid_signature(self, client: TestClient):
        """Should reject webhook with invalid signature."""
        response = client.post(
            "/api/site/checkout/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"stripe-signature": "invalid_signature"}
        )

        assert response.status_code == 400

    @pytest.mark.integration
    @patch('stripe.Webhook.construct_event')
    def test_webhook_duplicate_processing(
            self, mock_construct,
            client: TestClient, test_payment, db_session
    ):
        """Should handle duplicate webhook gracefully."""
        mock_construct.return_value = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": test_payment.stripe_session_id,
                    "payment_intent": "pi_123",
                    "metadata": {}
                }
            }
        }

        response = client.post(
            "/api/site/checkout/webhook",
            content=b'{}',
            headers={"stripe-signature": "valid_sig"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "already_processed"


class TestFreeCheckout:
    """Tests for free ticket checkout flow."""

    @pytest.mark.integration
    @patch('api.checkout._tt_get')
    @patch('api.checkout._issue_tt_tickets_and_notify')
    def test_free_checkout_success(
            self, mock_issue_tickets, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should handle free ticket checkout without Stripe."""
        mock_tt_get.return_value = {
            "id": "ev_free",
            "name": "Free Event",
            "ticket_types": [
                {
                    "id": "tt_free",
                    "name": "Free Ticket",
                    "price": 0,
                    "status": "on_sale",
                    "quantity": 100,
                    "quantity_available": 100
                }
            ]
        }
        mock_issue_tickets.return_value = None

        response = client.post(
            "/api/site/checkout/session",
            json={
                "event_id": "ev_free",
                "items": [{"ticket_type_id": "tt_free", "quantity": 2}],
                "customer_email": "customer@test.com",
                "customer_name": "Free Customer",
                "customer_phone": "1234567890"
            },
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"].startswith("free_")
        assert "/checkout/success" in data["url"]
