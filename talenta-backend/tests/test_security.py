"""
Unit tests for core/security.py - Password hashing and JWT utilities.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    set_auth_cookies,
    clear_auth_cookies,
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
)


class TestPasswordHashing:
    """Tests for password hashing functions."""

    @pytest.mark.unit
    def test_get_password_hash_returns_hash(self):
        """Should return a hashed password that is different from plain text."""
        plain_password = "MySecurePassword123!"
        hashed = get_password_hash(plain_password)

        assert hashed is not None
        assert hashed != plain_password
        assert len(hashed) > 0

    @pytest.mark.unit
    def test_get_password_hash_is_bcrypt_format(self):
        """Should return a bcrypt hash (starts with $2b$)."""
        hashed = get_password_hash("TestPassword")

        assert hashed.startswith("$2b$")

    @pytest.mark.unit
    def test_verify_password_correct(self):
        """Should return True for correct password."""
        plain_password = "CorrectPassword123!"
        hashed = get_password_hash(plain_password)

        result = verify_password(plain_password, hashed)

        assert result is True

    @pytest.mark.unit
    def test_verify_password_incorrect(self):
        """Should return False for incorrect password."""
        plain_password = "CorrectPassword123!"
        hashed = get_password_hash(plain_password)

        result = verify_password("WrongPassword456!", hashed)

        assert result is False

    @pytest.mark.unit
    def test_verify_password_empty(self):
        """Should return False for empty password."""
        hashed = get_password_hash("SomePassword")

        result = verify_password("", hashed)

        assert result is False

    @pytest.mark.unit
    def test_hash_is_unique_per_call(self):
        """Same password should produce different hashes (salt)."""
        password = "SamePassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestJWTTokens:
    """Tests for JWT token creation and decoding."""

    @pytest.mark.unit
    def test_create_access_token_basic(self):
        """Should create a valid access token."""
        data = {"sub": "123"}
        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    @pytest.mark.unit
    def test_access_token_contains_correct_data(self):
        """Access token should contain the provided subject."""
        data = {"sub": "user_456"}
        token = create_access_token(data)

        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "user_456"
        assert payload["type"] == "access"

    @pytest.mark.unit
    def test_access_token_has_expiration(self):
        """Access token should have an expiration time."""
        data = {"sub": "123"}
        token = create_access_token(data)

        payload = decode_token(token)

        assert "exp" in payload
        assert payload["exp"] > datetime.utcnow().timestamp()

    @pytest.mark.unit
    def test_access_token_custom_expiration(self):
        """Should accept custom expiration delta and create valid token."""
        data = {"sub": "123"}
        custom_delta = timedelta(minutes=5)
        token = create_access_token(data, expires_delta=custom_delta)

        payload = decode_token(token)

        # Verify the token was created successfully
        assert payload is not None
        assert payload["sub"] == "123"
        assert payload["type"] == "access"
        # Verify expiration exists and is in the future
        assert "exp" in payload
        assert payload["exp"] > datetime.utcnow().timestamp()

    @pytest.mark.unit
    def test_create_refresh_token_basic(self):
        """Should create a valid refresh token."""
        data = {"sub": "789"}
        token = create_refresh_token(data)

        assert token is not None
        assert isinstance(token, str)

    @pytest.mark.unit
    def test_refresh_token_has_correct_type(self):
        """Refresh token should have type 'refresh'."""
        data = {"sub": "789"}
        token = create_refresh_token(data)

        payload = decode_token(token)

        assert payload["type"] == "refresh"

    @pytest.mark.unit
    def test_decode_token_valid(self):
        """Should decode a valid token correctly."""
        data = {"sub": "test_user", "extra": "data"}
        token = create_access_token(data)

        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "test_user"
        assert payload["extra"] == "data"

    @pytest.mark.unit
    def test_decode_token_invalid(self):
        """Should return None for invalid token."""
        result = decode_token("invalid.token.here")

        assert result is None

    @pytest.mark.unit
    def test_decode_token_empty(self):
        """Should return None for empty token."""
        result = decode_token("")

        assert result is None

    @pytest.mark.unit
    def test_decode_token_malformed(self):
        """Should return None for malformed token."""
        result = decode_token("not-a-jwt")

        assert result is None

    @pytest.mark.unit
    def test_access_and_refresh_tokens_are_different(self):
        """Access and refresh tokens should be different."""
        data = {"sub": "123"}
        access = create_access_token(data)
        refresh = create_refresh_token(data)

        assert access != refresh


class TestCookieHelpers:
    """Tests for cookie setting and clearing functions."""

    @pytest.mark.unit
    def test_set_auth_cookies(self):
        """Should set both access and refresh cookies."""
        mock_response = MagicMock()
        access_token = "access_token_value"
        refresh_token = "refresh_token_value"

        set_auth_cookies(mock_response, access_token, refresh_token)

        # Should be called twice (access + refresh)
        assert mock_response.set_cookie.call_count == 2

    @pytest.mark.unit
    def test_set_auth_cookies_httponly(self):
        """Cookies should be HttpOnly for security."""
        mock_response = MagicMock()

        set_auth_cookies(mock_response, "access", "refresh")

        for call in mock_response.set_cookie.call_args_list:
            kwargs = call.kwargs if hasattr(call, 'kwargs') else call[1]
            assert kwargs.get("httponly") is True

    @pytest.mark.unit
    def test_clear_auth_cookies(self):
        """Should clear both auth cookies."""
        mock_response = MagicMock()

        clear_auth_cookies(mock_response)

        # Should delete both cookies
        assert mock_response.delete_cookie.call_count == 2

    @pytest.mark.unit
    def test_cookie_names_are_defined(self):
        """Cookie names should be properly defined."""
        assert ACCESS_COOKIE_NAME == "talenta_access_token"
        assert REFRESH_COOKIE_NAME == "talenta_refresh_token"
