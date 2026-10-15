"""Tests for app.modules.telematics.providers.factory — get_provider() behaviour."""

import pytest
from unittest.mock import patch, MagicMock


def _clear_provider_cache():
    """Clear the lru_cache on get_provider so each test gets a fresh call."""
    from app.modules.telematics.providers.factory import get_provider
    get_provider.cache_clear()


@pytest.fixture(autouse=True)
def clear_cache():
    """Ensure the lru_cache is cleared before and after every test."""
    _clear_provider_cache()
    yield
    _clear_provider_cache()


def test_get_provider_returns_mock_provider_when_mode_is_mock():
    """When TELEMATICS_MODE=mock the factory returns a MockOdometerProvider."""
    mock_settings = MagicMock()
    mock_settings.TELEMATICS_MODE = "mock"

    with patch("app.modules.telematics.providers.factory.settings", mock_settings):
        from app.modules.telematics.providers.factory import get_provider
        provider = get_provider()

    from app.modules.telematics.providers.mock_provider import MockOdometerProvider
    assert isinstance(provider, MockOdometerProvider)


def test_get_provider_returns_live_provider_when_mode_is_live():
    """When TELEMATICS_MODE=live the factory returns a LiveOdometerProvider."""
    mock_settings = MagicMock()
    mock_settings.TELEMATICS_MODE = "live"
    mock_settings.TELEMATICS_LIVE_BASE_URL = "https://telematics.example.com"
    mock_settings.TELEMATICS_API_KEY = "test-api-key"
    mock_settings.TELEMATICS_REQUEST_TIMEOUT_SECONDS = 10

    with patch("app.modules.telematics.providers.factory.settings", mock_settings), \
         patch("app.modules.telematics.providers.live_provider.settings", mock_settings):
        from app.modules.telematics.providers.factory import get_provider
        provider = get_provider()

    from app.modules.telematics.providers.live_provider import LiveOdometerProvider
    assert isinstance(provider, LiveOdometerProvider)


def test_get_provider_raises_value_error_for_unknown_mode():
    """When TELEMATICS_MODE is unrecognised the factory raises ValueError."""
    mock_settings = MagicMock()
    mock_settings.TELEMATICS_MODE = "invalid_mode"

    with patch("app.modules.telematics.providers.factory.settings", mock_settings):
        from app.modules.telematics.providers.factory import get_provider
        with pytest.raises(ValueError) as exc_info:
            get_provider()

    assert "invalid_mode" in str(exc_info.value)
    assert "mock" in str(exc_info.value)
    assert "live" in str(exc_info.value)


def test_get_provider_is_cached_across_calls():
    """get_provider() returns the identical instance on repeated calls (lru_cache)."""
    mock_settings = MagicMock()
    mock_settings.TELEMATICS_MODE = "mock"

    with patch("app.modules.telematics.providers.factory.settings", mock_settings):
        from app.modules.telematics.providers.factory import get_provider
        provider_first = get_provider()
        provider_second = get_provider()

    assert provider_first is provider_second


def test_get_provider_mode_is_case_insensitive():
    """TELEMATICS_MODE comparison is case-insensitive (MOCK, Mock, mock all work)."""
    mock_settings = MagicMock()
    mock_settings.TELEMATICS_MODE = "MOCK"

    with patch("app.modules.telematics.providers.factory.settings", mock_settings):
        from app.modules.telematics.providers.factory import get_provider
        provider = get_provider()

    from app.modules.telematics.providers.mock_provider import MockOdometerProvider
    assert isinstance(provider, MockOdometerProvider)


def test_get_provider_returned_instance_satisfies_abstract_interface():
    """The returned provider implements OdometerProvider (has fetch_readings)."""
    mock_settings = MagicMock()
    mock_settings.TELEMATICS_MODE = "mock"

    with patch("app.modules.telematics.providers.factory.settings", mock_settings):
        from app.modules.telematics.providers.factory import get_provider
        provider = get_provider()

    from app.modules.telematics.providers import OdometerProvider
    assert isinstance(provider, OdometerProvider)
    assert callable(getattr(provider, "fetch_readings", None))
