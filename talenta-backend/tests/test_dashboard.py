"""
Integration tests for dashboard API endpoints (api/dashboard.py).
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


class TestDashboardEndpoint:
    """Tests for GET /api/dashboard endpoint."""

    @pytest.mark.integration
    @patch('httpx.AsyncClient')
    def test_dashboard_no_clients(
            self, mock_client,
            client: TestClient, test_admin, auth_headers, db_session
    ):
        """Should return zeros when no clients exist."""
        response = client.get("/api/dashboard", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert data["summary"]["total_clients"] == 0
        assert data["summary"]["total_events"] == 0
        assert data["summary"]["total_tickets_sold"] == 0

    @pytest.mark.integration
    def test_dashboard_without_auth(self, client: TestClient):
        """Should reject request without authentication."""
        response = client.get("/api/dashboard")

        assert response.status_code == 401

    @pytest.mark.integration
    @patch('httpx.AsyncClient')
    def test_dashboard_with_client(
            self, mock_async_client,
            client: TestClient, test_admin, auth_headers, test_client_entity, db_session
    ):
        """Should aggregate data from all clients."""
        # Mock the AsyncClient context manager
        mock_http = MagicMock()
        mock_async_client.return_value.__aenter__.return_value = mock_http

        # Mock TT API responses
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "id": "ev_1",
                    "name": "Event 1",
                    "status": "published",
                    "ticket_types": [
                        {"id": "tt_1", "quantity_issued": 10, "price": 1500}
                    ]
                }
            ]
        }
        mock_http.get.return_value = mock_response

        response = client.get("/api/dashboard", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["total_clients"] == 1
        assert "clients" in data
        assert len(data["clients"]) == 1


class TestDashboardPaymentsEndpoint:
    """Tests for GET /api/dashboard/payments endpoint."""

    @pytest.mark.integration
    def test_payments_empty(self, client: TestClient, test_admin, auth_headers, db_session):
        """Should return empty list when no payments exist."""
        response = client.get("/api/dashboard/payments", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []
        assert data["total_records"] == 0
        assert data["stats"]["total_volume_cents"] == 0

    @pytest.mark.integration
    def test_payments_with_data(
            self, client: TestClient, test_admin, auth_headers, test_payment, db_session
    ):
        """Should return paginated payments with stats."""
        response = client.get("/api/dashboard/payments", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 1
        assert len(data["data"]) == 1
        assert data["stats"]["successful"] == 1
        assert data["stats"]["total_volume_cents"] == 3000

    @pytest.mark.integration
    def test_payments_pagination(
            self, client: TestClient, test_admin, auth_headers, test_payment, db_session
    ):
        """Should respect pagination parameters."""
        response = client.get(
            "/api/dashboard/payments?page=1&limit=5",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["current_page"] == 1
        assert "total_pages" in data

    @pytest.mark.integration
    def test_payments_search(
            self, client: TestClient, test_admin, auth_headers, test_payment, db_session
    ):
        """Should filter payments by search term."""
        response = client.get(
            "/api/dashboard/payments?search=customer@test.com",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 1

    @pytest.mark.integration
    def test_payments_search_no_match(
            self, client: TestClient, test_admin, auth_headers, test_payment, db_session
    ):
        """Should return empty when search has no match."""
        response = client.get(
            "/api/dashboard/payments?search=nonexistent",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 0

    @pytest.mark.integration
    def test_payments_filter_by_client(
            self, client: TestClient, test_admin, auth_headers, test_payment, test_client_entity, db_session
    ):
        """Should filter payments by client_id."""
        response = client.get(
            f"/api/dashboard/payments?client_id={test_client_entity.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 1

    @pytest.mark.integration
    def test_payments_filter_by_wrong_client(
            self, client: TestClient, test_admin, auth_headers, test_payment, db_session
    ):
        """Should return empty when filtering by non-matching client."""
        response = client.get(
            "/api/dashboard/payments?client_id=99999",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 0

    @pytest.mark.integration
    def test_payments_without_auth(self, client: TestClient):
        """Should reject request without authentication."""
        response = client.get("/api/dashboard/payments")

        assert response.status_code == 401


class TestDashboardStats:
    """Tests for dashboard statistics calculations."""

    @pytest.mark.integration
    def test_stats_calculation(
            self, client: TestClient, test_admin, auth_headers, test_payment, db_session
    ):
        """Should calculate correct payment statistics."""
        response = client.get("/api/dashboard/payments", headers=auth_headers)

        assert response.status_code == 200
        stats = response.json()["stats"]

        # Based on test_payment fixture
        assert stats["successful"] == 1
        assert stats["pending_failed"] == 0
        assert stats["total_volume_cents"] == 3000  # 2 tickets * $15

    @pytest.mark.integration
    def test_stats_with_failed_payment(
            self, client: TestClient, test_admin, auth_headers, test_client_entity, db_session
    ):
        """Should correctly count failed payments."""
        from models.payment import Payment
        from datetime import datetime

        # Add a failed payment
        failed_payment = Payment(
            stripe_session_id="cs_failed_123",
            client_id=test_client_entity.id,
            client_name=test_client_entity.name,
            stripe_account_id=test_client_entity.stripe_account_id,
            event_id="ev_test",
            event_name="Test Event",
            ticket_type_id="tt_test",
            ticket_type_name="Test Ticket",
            quantity=1,
            unit_amount_cents=1000,
            total_amount_cents=1000,
            platform_fee_cents=50,
            currency="usd",
            customer_email="failed@test.com",
            status="failed"
        )
        db_session.add(failed_payment)
        db_session.commit()

        response = client.get("/api/dashboard/payments", headers=auth_headers)

        assert response.status_code == 200
        stats = response.json()["stats"]
        assert stats["pending_failed"] == 1
        # Failed payments shouldn't count towards volume
        assert stats["total_volume_cents"] == 0
