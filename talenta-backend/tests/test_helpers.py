"""
Unit tests for helper functions across the codebase.
"""
import pytest


class TestCleanDomainFunction:
    """Tests for the clean_domain helper in api/site.py."""

    @pytest.mark.unit
    def test_clean_domain_removes_https(self):
        """Should remove https:// prefix."""
        from api.site import clean_domain

        result = clean_domain("https://example.com")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_domain_removes_http(self):
        """Should remove http:// prefix."""
        from api.site import clean_domain

        result = clean_domain("http://example.com")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_domain_removes_port(self):
        """Should remove port number for production domains."""
        from api.site import clean_domain

        result = clean_domain("https://example.com:8080")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_domain_preserves_localhost_port(self):
        """Should preserve port for localhost."""
        from api.site import clean_domain

        result = clean_domain("http://localhost:5173")
        assert result == "localhost:5173"

    @pytest.mark.unit
    def test_clean_domain_preserves_127_port(self):
        """Should preserve port for 127.0.0.1."""
        from api.site import clean_domain

        result = clean_domain("http://127.0.0.1:3000")
        assert result == "127.0.0.1:3000"

    @pytest.mark.unit
    def test_clean_domain_removes_trailing_slash(self):
        """Should remove trailing slashes."""
        from api.site import clean_domain

        result = clean_domain("https://example.com/")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_domain_removes_path(self):
        """Should remove path components."""
        from api.site import clean_domain

        result = clean_domain("https://example.com/path/to/page")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_domain_lowercase(self):
        """Should convert to lowercase."""
        from api.site import clean_domain

        result = clean_domain("https://EXAMPLE.COM")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_domain_empty_string(self):
        """Should return empty string for empty input."""
        from api.site import clean_domain

        result = clean_domain("")
        assert result == ""

    @pytest.mark.unit
    def test_clean_domain_none(self):
        """Should return empty string for None input."""
        from api.site import clean_domain

        result = clean_domain(None)
        assert result == ""

    @pytest.mark.unit
    def test_clean_domain_strips_whitespace(self):
        """Should strip leading/trailing whitespace."""
        from api.site import clean_domain

        result = clean_domain("  https://example.com  ")
        assert result == "example.com"


class TestCleanOriginForCors:
    """Tests for the clean_origin_for_cors helper in main.py."""

    @pytest.mark.unit
    def test_clean_origin_removes_https(self):
        """Should remove https:// prefix."""
        from main import clean_origin_for_cors

        result = clean_origin_for_cors("https://admin.example.com")
        assert result == "admin.example.com"

    @pytest.mark.unit
    def test_clean_origin_removes_http(self):
        """Should remove http:// prefix."""
        from main import clean_origin_for_cors

        result = clean_origin_for_cors("http://admin.example.com")
        assert result == "admin.example.com"

    @pytest.mark.unit
    def test_clean_origin_removes_port(self):
        """Should remove port number."""
        from main import clean_origin_for_cors

        result = clean_origin_for_cors("http://localhost:5173")
        assert result == "localhost"

    @pytest.mark.unit
    def test_clean_origin_removes_trailing_slash(self):
        """Should remove trailing slash."""
        from main import clean_origin_for_cors

        result = clean_origin_for_cors("https://example.com/")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_origin_lowercase(self):
        """Should convert to lowercase."""
        from main import clean_origin_for_cors

        result = clean_origin_for_cors("https://EXAMPLE.COM")
        assert result == "example.com"

    @pytest.mark.unit
    def test_clean_origin_empty(self):
        """Should return empty string for empty input."""
        from main import clean_origin_for_cors

        result = clean_origin_for_cors("")
        assert result == ""

    @pytest.mark.unit
    def test_clean_origin_none(self):
        """Should return empty string for None."""
        from main import clean_origin_for_cors

        result = clean_origin_for_cors(None)
        assert result == ""


class TestTicketTailorHeaders:
    """Tests for TicketTailor API header generation."""

    @pytest.mark.unit
    def test_tt_headers_format(self):
        """Should generate correct Basic Auth header."""
        from api.tickettailor import _tt_headers
        import base64

        api_key = "sk_test_12345"
        headers = _tt_headers(api_key)

        # Verify Authorization header format
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Basic ")

        # Decode and verify
        encoded_part = headers["Authorization"].replace("Basic ", "")
        decoded = base64.b64decode(encoded_part).decode()
        assert decoded == f"{api_key}:"

    @pytest.mark.unit
    def test_tt_headers_accept_json(self):
        """Should include Accept: application/json header."""
        from api.tickettailor import _tt_headers

        headers = _tt_headers("any_key")

        assert headers.get("Accept") == "application/json"


class TestGetSeriesId:
    """Tests for _get_series_id helper in tickettailor.py."""

    @pytest.mark.unit
    def test_get_series_id_from_dict(self):
        """Should extract series ID from dict."""
        from api.tickettailor import _get_series_id

        event_data = {"event_series": {"id": "es_123"}}
        result = _get_series_id(event_data)

        assert result == "es_123"

    @pytest.mark.unit
    def test_get_series_id_from_string(self):
        """Should return series ID when it's a string."""
        from api.tickettailor import _get_series_id

        event_data = {"event_series": "es_456"}
        result = _get_series_id(event_data)

        assert result == "es_456"

    @pytest.mark.unit
    def test_get_series_id_from_fallback(self):
        """Should use event_series_id as fallback."""
        from api.tickettailor import _get_series_id

        event_data = {"event_series_id": "es_789"}
        result = _get_series_id(event_data)

        assert result == "es_789"

    @pytest.mark.unit
    def test_get_series_id_missing(self):
        """Should return None when no series ID found."""
        from api.tickettailor import _get_series_id

        event_data = {}
        result = _get_series_id(event_data)

        assert result is None


class TestCheckoutBaseUrl:
    """Tests for get_base_url helper in checkout.py."""

    @pytest.mark.unit
    def test_get_base_url_from_origin(self):
        """Should extract base URL from Origin header."""
        from api.checkout import get_base_url
        from unittest.mock import MagicMock

        request = MagicMock()
        request.headers.get.side_effect = lambda h, d="": {
            "origin": "https://client.example.com/",
        }.get(h, d)

        result = get_base_url(request)

        assert result == "https://client.example.com"

    @pytest.mark.unit
    def test_get_base_url_from_referer(self):
        """Should fall back to Referer header."""
        from api.checkout import get_base_url
        from unittest.mock import MagicMock

        request = MagicMock()
        request.headers.get.side_effect = lambda h, d="": {
            "origin": None,
            "referer": "https://client.example.com/events",
        }.get(h, d)

        result = get_base_url(request)

        assert result == "https://client.example.com/events"

    @pytest.mark.unit
    def test_get_base_url_removes_trailing_slash(self):
        """Should remove trailing slash from origin."""
        from api.checkout import get_base_url
        from unittest.mock import MagicMock

        request = MagicMock()
        request.headers.get.side_effect = lambda h, d="": {
            "origin": "https://example.com/",
        }.get(h, d)

        result = get_base_url(request)

        assert result == "https://example.com"


class TestDepsAuthentication:
    """Tests for authentication dependency edge cases."""

    @pytest.mark.unit
    def test_oauth2_scheme_config(self):
        """OAuth2 scheme should be configured correctly."""
        from core.deps import oauth2_scheme

        # OAuth2PasswordBearer stores the token URL in model.flows.password.tokenUrl
        assert oauth2_scheme.model.flows.password.tokenUrl == "/api/auth/login"
        assert oauth2_scheme.auto_error is False
