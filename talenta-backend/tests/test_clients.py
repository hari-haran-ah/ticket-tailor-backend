"""
Integration tests for clients API endpoints (api/clients.py).
"""
import pytest
from fastapi.testclient import TestClient


class TestListClientsEndpoint:
    """Tests for GET /api/clients endpoint."""

    @pytest.mark.integration
    def test_list_clients_empty(self, client: TestClient, test_admin, auth_headers):
        """Should return empty list when no clients exist."""
        response = client.get("/api/clients", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.integration
    def test_list_clients_success(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should return list of clients."""
        response = client.get("/api/clients", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Client Business"
        assert data[0]["domain_name"] == "https://testclient.example.com"

    @pytest.mark.integration
    def test_list_clients_without_auth(self, client: TestClient):
        """Should reject request without authentication."""
        response = client.get("/api/clients")

        assert response.status_code == 401


class TestListClientsPaginatedEndpoint:
    """Tests for GET /api/clients/paginated endpoint."""

    @pytest.mark.integration
    def test_paginated_default_params(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should return paginated results with default parameters."""
        response = client.get("/api/clients/paginated", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data
        assert data["total"] == 1

    @pytest.mark.integration
    def test_paginated_search(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should filter clients by search term."""
        response = client.get(
            "/api/clients/paginated?search=testclient",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    @pytest.mark.integration
    def test_paginated_search_no_match(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should return empty when search has no match."""
        response = client.get(
            "/api/clients/paginated?search=nonexistent",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    @pytest.mark.integration
    def test_paginated_filter_active(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should filter by is_active status."""
        response = client.get(
            "/api/clients/paginated?is_active=true",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    @pytest.mark.integration
    def test_paginated_sort_by_name(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should sort clients by name."""
        response = client.get(
            "/api/clients/paginated?sort_by=name&sort_order=asc",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["total"] >= 0


class TestCreateClientEndpoint:
    """Tests for POST /api/clients endpoint."""

    @pytest.mark.integration
    def test_create_client_success(self, client: TestClient, test_admin, auth_headers, test_data_factory):
        """Should create a new client successfully."""
        client_data = test_data_factory.create_client_data()

        response = client.post("/api/clients", json=client_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Test Client"
        assert data["domain_name"] == "https://newclient.example.com"
        assert data["is_active"] is True
        assert "id" in data

    @pytest.mark.integration
    def test_create_client_duplicate_domain(self, client: TestClient, test_admin, auth_headers, test_client_entity, test_data_factory):
        """Should reject duplicate domain name."""
        client_data = test_data_factory.create_client_data({
            "domain_name": "https://testclient.example.com"  # Already exists
        })

        response = client.post("/api/clients", json=client_data, headers=auth_headers)

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    @pytest.mark.integration
    def test_create_client_missing_required_fields(self, client: TestClient, test_admin, auth_headers):
        """Should reject client creation with missing required fields."""
        response = client.post(
            "/api/clients",
            json={"name": "Incomplete Client"},  # Missing domain_name and tt_api_key
            headers=auth_headers
        )

        assert response.status_code == 422

    @pytest.mark.integration
    def test_create_client_without_auth(self, client: TestClient, test_data_factory):
        """Should reject creation without authentication."""
        client_data = test_data_factory.create_client_data()

        response = client.post("/api/clients", json=client_data)

        assert response.status_code == 401


class TestGetClientEndpoint:
    """Tests for GET /api/clients/{client_id} endpoint."""

    @pytest.mark.integration
    def test_get_client_success(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should return client details."""
        response = client.get(
            f"/api/clients/{test_client_entity.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_client_entity.id
        assert data["name"] == "Test Client Business"

    @pytest.mark.integration
    def test_get_client_not_found(self, client: TestClient, test_admin, auth_headers):
        """Should return 404 for non-existent client."""
        response = client.get("/api/clients/99999", headers=auth_headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestUpdateClientEndpoint:
    """Tests for PUT /api/clients/{client_id} endpoint."""

    @pytest.mark.integration
    def test_update_client_success(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should update client successfully."""
        response = client.put(
            f"/api/clients/{test_client_entity.id}",
            json={"name": "Updated Client Name"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Client Name"
        # Other fields should remain unchanged
        assert data["domain_name"] == "https://testclient.example.com"

    @pytest.mark.integration
    def test_update_client_not_found(self, client: TestClient, test_admin, auth_headers):
        """Should return 404 for non-existent client."""
        response = client.put(
            "/api/clients/99999",
            json={"name": "Updated Name"},
            headers=auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.integration
    def test_update_client_partial(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should allow partial updates."""
        response = client.put(
            f"/api/clients/{test_client_entity.id}",
            json={"platform_fee": 7.50},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert float(data["platform_fee"]) == 7.50


class TestDeleteClientEndpoint:
    """Tests for DELETE /api/clients/{client_id} endpoint."""

    @pytest.mark.integration
    def test_delete_client_success(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should delete client successfully."""
        response = client.delete(
            f"/api/clients/{test_client_entity.id}",
            headers=auth_headers
        )

        assert response.status_code == 204

        # Verify deletion
        get_response = client.get(
            f"/api/clients/{test_client_entity.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404

    @pytest.mark.integration
    def test_delete_client_not_found(self, client: TestClient, test_admin, auth_headers):
        """Should return 404 for non-existent client."""
        response = client.delete("/api/clients/99999", headers=auth_headers)

        assert response.status_code == 404


class TestToggleClientStatusEndpoint:
    """Tests for PATCH /api/clients/{client_id}/toggle-status endpoint."""

    @pytest.mark.integration
    def test_toggle_status_active_to_inactive(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should toggle active client to inactive."""
        assert test_client_entity.is_active is True

        response = client.patch(
            f"/api/clients/{test_client_entity.id}/toggle-status",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

    @pytest.mark.integration
    def test_toggle_status_twice(self, client: TestClient, test_admin, auth_headers, test_client_entity):
        """Should toggle back when called twice."""
        # First toggle: active -> inactive
        client.patch(
            f"/api/clients/{test_client_entity.id}/toggle-status",
            headers=auth_headers
        )

        # Second toggle: inactive -> active
        response = client.patch(
            f"/api/clients/{test_client_entity.id}/toggle-status",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["is_active"] is True

    @pytest.mark.integration
    def test_toggle_status_not_found(self, client: TestClient, test_admin, auth_headers):
        """Should return 404 for non-existent client."""
        response = client.patch("/api/clients/99999/toggle-status", headers=auth_headers)

        assert response.status_code == 404
