"""
Integration tests for main.py health endpoints and site API endpoints.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.integration
    def test_root_endpoint(self, client: TestClient):
        """Should return service status."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "Talenta Backend"

    @pytest.mark.integration
    def test_health_check_success(self, client: TestClient, db_session):
        """Should return healthy status when database is connected."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


class TestSiteEventsEndpoint:
    """Tests for GET /api/site/events endpoint."""

    @pytest.mark.integration
    @patch('api.site._tt_get')
    def test_list_site_events_success(
            self, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should return events for the identified client."""
        mock_tt_get.return_value = {
            "data": [
                {
                    "id": "ev_1",
                    "name": "Public Event",
                    "start": {"iso": "2024-12-01T10:00:00Z"},
                    "ticket_types": [
                        {"id": "tt_1", "quantity_issued": 5, "quantity": 100}
                    ]
                }
            ]
        }

        response = client.get(
            "/api/site/events",
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "Test Client Business"
        assert len(data["data"]) == 1
        assert data["data"][0]["total_issued_tickets"] == 5

    @pytest.mark.integration
    def test_list_site_events_no_client(self, client: TestClient, db_session):
        """Should return 404 when client cannot be identified."""
        response = client.get(
            "/api/site/events",
            headers={"X-Client-ID": "99999"}
        )

        assert response.status_code == 404


class TestSiteEventDetailEndpoint:
    """Tests for GET /api/site/events/{event_id} endpoint."""

    @pytest.mark.integration
    @patch('api.site._tt_get')
    def test_get_site_event_success(
            self, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should return single event details."""
        mock_tt_get.return_value = {
            "id": "ev_detail",
            "name": "Event Detail",
            "description": "A test event",
            "ticket_types": [
                {
                    "id": "tt_1",
                    "name": "GA",
                    "price": 2000,
                    "quantity_issued": 10,
                    "quantity": 50
                },
                {
                    "id": "tt_2",
                    "name": "VIP",
                    "price": 5000,
                    "quantity_issued": 5,
                    "quantity": 20
                }
            ]
        }

        response = client.get(
            "/api/site/events/ev_detail",
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "ev_detail"
        assert data["name"] == "Event Detail"
        assert data["total_issued_tickets"] == 15  # 10 + 5

    @pytest.mark.integration
    @patch('api.site._tt_get')
    def test_get_site_event_calculates_availability(
            self, mock_tt_get,
            client: TestClient, test_client_entity, db_session
    ):
        """Should calculate quantity_sold and quantity_available."""
        mock_tt_get.return_value = {
            "id": "ev_avail",
            "name": "Availability Test",
            "ticket_types": [
                {
                    "id": "tt_1",
                    "quantity_issued": 30,
                    "quantity": 70  # This is remaining, not total
                }
            ]
        }

        response = client.get(
            "/api/site/events/ev_avail",
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 200
        tt = response.json()["ticket_types"][0]
        # quantity becomes total capacity (remaining + issued)
        assert tt["quantity"] == 100  # 70 + 30
        assert tt["quantity_available"] == 70
        assert tt["quantity_sold"] == 30


class TestClientIdentification:
    """Tests for client identification logic."""

    @pytest.mark.integration
    def test_identify_by_header(self, client: TestClient, test_client_entity, db_session):
        """Should identify client by X-Client-ID header."""
        with patch('api.site._tt_get') as mock_tt:
            mock_tt.return_value = {"data": []}

            response = client.get(
                "/api/site/events",
                headers={"X-Client-ID": str(test_client_entity.id)}
            )

            assert response.status_code == 200
            assert response.json()["client_name"] == "Test Client Business"

    @pytest.mark.integration
    def test_identify_inactive_client_rejected(
            self, client: TestClient, test_client_entity, db_session
    ):
        """Should reject inactive clients."""
        # Deactivate the client
        test_client_entity.is_active = False
        db_session.commit()

        response = client.get(
            "/api/site/events",
            headers={"X-Client-ID": str(test_client_entity.id)}
        )

        assert response.status_code == 404


class TestCORSMiddleware:
    """Tests for dynamic CORS middleware."""

    @pytest.mark.integration
    def test_cors_localhost_allowed(self, client: TestClient, db_session):
        """Should allow localhost origins in development."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:5173"}
        )

        assert response.status_code == 200
