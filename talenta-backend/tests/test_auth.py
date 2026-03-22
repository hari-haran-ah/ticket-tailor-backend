"""
Integration tests for auth API endpoints (api/auth.py).
"""
import pytest
from fastapi.testclient import TestClient


class TestLoginEndpoint:
    """Tests for POST /api/auth/login endpoint."""

    @pytest.mark.integration
    def test_login_success(self, client: TestClient, test_admin):
        """Should login successfully with valid credentials."""
        response = client.post(
            "/api/auth/login",
            json={"email": "testadmin@example.com", "password": "TestPassword123!"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Login successful"
        assert "admin" in data
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["admin"]["email"] == "testadmin@example.com"

    @pytest.mark.integration
    def test_login_sets_cookies(self, client: TestClient, test_admin):
        """Should set auth cookies on successful login."""
        response = client.post(
            "/api/auth/login",
            json={"email": "testadmin@example.com", "password": "TestPassword123!"}
        )

        assert response.status_code == 200
        cookies = response.cookies
        assert "talenta_access_token" in cookies
        assert "talenta_refresh_token" in cookies

    @pytest.mark.integration
    def test_login_invalid_email(self, client: TestClient, test_admin):
        """Should reject login with non-existent email."""
        response = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "TestPassword123!"}
        )

        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    @pytest.mark.integration
    def test_login_invalid_password(self, client: TestClient, test_admin):
        """Should reject login with wrong password."""
        response = client.post(
            "/api/auth/login",
            json={"email": "testadmin@example.com", "password": "WrongPassword!"}
        )

        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    @pytest.mark.integration
    def test_login_inactive_account(self, client: TestClient, inactive_admin):
        """Should reject login for inactive accounts."""
        response = client.post(
            "/api/auth/login",
            json={"email": "inactive@example.com", "password": "TestPassword123!"}
        )

        assert response.status_code == 403
        assert "Account disabled" in response.json()["detail"]

    @pytest.mark.integration
    def test_login_missing_email(self, client: TestClient):
        """Should return 422 for missing email."""
        response = client.post(
            "/api/auth/login",
            json={"password": "TestPassword123!"}
        )

        assert response.status_code == 422

    @pytest.mark.integration
    def test_login_missing_password(self, client: TestClient):
        """Should return 422 for missing password."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com"}
        )

        assert response.status_code == 422


class TestRefreshEndpoint:
    """Tests for POST /api/auth/refresh endpoint."""

    @pytest.mark.integration
    def test_refresh_with_body_token(self, client: TestClient, test_admin):
        """Should refresh token using body parameter."""
        # First login to get tokens
        login_response = client.post(
            "/api/auth/login",
            json={"email": "testadmin@example.com", "password": "TestPassword123!"}
        )
        refresh_token = login_response.json()["refresh_token"]

        # Use refresh token
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Token refreshed"
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.integration
    def test_refresh_missing_token(self, client: TestClient):
        """Should reject refresh without token."""
        response = client.post("/api/auth/refresh", json={})

        assert response.status_code == 401
        assert "Invalid or expired refresh token" in response.json()["detail"]

    @pytest.mark.integration
    def test_refresh_invalid_token(self, client: TestClient):
        """Should reject refresh with invalid token."""
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid_token"}
        )

        assert response.status_code == 401

    @pytest.mark.integration
    def test_refresh_with_access_token_fails(self, client: TestClient, test_admin):
        """Should reject using access token for refresh."""
        # Get access token (not refresh)
        login_response = client.post(
            "/api/auth/login",
            json={"email": "testadmin@example.com", "password": "TestPassword123!"}
        )
        access_token = login_response.json()["access_token"]

        # Try to use access token for refresh
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": access_token}  # Using wrong token type
        )

        assert response.status_code == 401


class TestLogoutEndpoint:
    """Tests for POST /api/auth/logout endpoint."""

    @pytest.mark.integration
    def test_logout_success(self, client: TestClient, test_admin, auth_headers):
        """Should logout successfully with valid token."""
        response = client.post("/api/auth/logout", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"

    @pytest.mark.integration
    def test_logout_without_auth(self, client: TestClient):
        """Should reject logout without authentication."""
        response = client.post("/api/auth/logout")

        assert response.status_code == 401


class TestMeEndpoint:
    """Tests for GET /api/auth/me endpoint."""

    @pytest.mark.integration
    def test_get_me_success(self, client: TestClient, test_admin, auth_headers):
        """Should return current admin info."""
        response = client.get("/api/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testadmin@example.com"
        assert data["full_name"] == "Test Admin"
        assert data["is_active"] is True

    @pytest.mark.integration
    def test_get_me_without_auth(self, client: TestClient):
        """Should reject request without authentication."""
        response = client.get("/api/auth/me")

        assert response.status_code == 401

    @pytest.mark.integration
    def test_get_me_invalid_token(self, client: TestClient):
        """Should reject request with invalid token."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401

    @pytest.mark.integration
    def test_get_me_does_not_return_password(self, client: TestClient, test_admin, auth_headers):
        """Should not include password in response."""
        response = client.get("/api/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "hashed_password" not in data
        assert "password" not in data
