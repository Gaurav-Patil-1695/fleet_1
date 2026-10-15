"""Unit tests for LiveOdometerProvider."""
import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

def _make_settings(**overrides):
    """Return a simple namespace that mimics app.config.settings."""
    defaults = {
        "TELEMATICS_LIVE_BASE_URL": "https://telematics.example.com",
        "TELEMATICS_API_KEY": "test-api-key",
        "TELEMATICS_REQUEST_TIMEOUT_SECONDS": 10,
    }
    defaults.update(overrides)
    ns = MagicMock()
    for k, v in defaults.items():
        setattr(ns, k, v)
    return ns


def _build_response(data: dict, status_code: int = 200) -> httpx.Response:
    """Build a mock httpx.Response with a JSON body."""
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.json.return_value = data
    if status_code >= 400:
        response.raise_for_status.side_effect = httpx.HTTPStatusError(
            message=f"HTTP {status_code}",
            request=MagicMock(),
            response=response,
        )
    else:
        response.raise_for_status.return_value = None
    return response


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fetch_readings_returns_correct_odometer_readings():
    """Happy path: valid API response is parsed into OdometerReading instances."""
    fake_settings = _make_settings()

    sample_response = {
        "readings": [
            {
                "vehicle_id": "VH-001",
                "odometer_km": 75000,
                "reading_timestamp": "2024-03-10T09:00:00Z",
            },
            {
                "vehicle_id": "VH-002",
                "odometer_km": 42000,
                "reading_timestamp": "2024-03-10T09:05:00Z",
            },
        ]
    }

    mock_response = _build_response(sample_response)
    mock_post = AsyncMock(return_value=mock_response)

    with patch("app.config.settings", fake_settings):
        from app.modules.telematics.providers.live_provider import LiveOdometerProvider
        provider = LiveOdometerProvider()

        with patch.object(httpx.AsyncClient, "post", mock_post):
            # We also need the async context manager to work
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)

            with patch("httpx.AsyncClient", return_value=mock_client):
                readings = await provider.fetch_readings(["VH-001", "VH-002"])

    assert len(readings) == 2
    assert readings[0].vehicle_id == "VH-001"
    assert readings[0].odometer_km == 75000
    assert readings[0].reading_timestamp == datetime(2024, 3, 10, 9, 0, 0, tzinfo=timezone.utc)
    assert readings[1].vehicle_id == "VH-002"
    assert readings[1].odometer_km == 42000


@pytest.mark.asyncio
async def test_fetch_readings_empty_list_returns_early():
    """When vehicle_ids is empty, no HTTP call is made and an empty list is returned."""
    fake_settings = _make_settings()

    with patch("app.config.settings", fake_settings):
        from app.modules.telematics.providers.live_provider import LiveOdometerProvider
        provider = LiveOdometerProvider()

        with patch("httpx.AsyncClient") as mock_client_cls:
            readings = await provider.fetch_readings([])
            mock_client_cls.assert_not_called()

    assert readings == []


@pytest.mark.asyncio
async def test_fetch_readings_sends_correct_auth_header_and_url():
    """The POST request must include Bearer token and target the /readings/bulk endpoint."""
    fake_settings = _make_settings(
        TELEMATICS_LIVE_BASE_URL="https://api.tele.io",
        TELEMATICS_API_KEY="secret-key-xyz",
    )

    mock_response = _build_response({"readings": []})
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.config.settings", fake_settings):
        from importlib import reload
        import app.modules.telematics.providers.live_provider as lp_module
        reload(lp_module)
        provider = lp_module.LiveOdometerProvider()

        with patch("httpx.AsyncClient", return_value=mock_client):
            await provider.fetch_readings(["VH-100"])

    mock_client.post.assert_awaited_once()
    call_kwargs = mock_client.post.call_args
    url_called = call_kwargs[0][0] if call_kwargs[0] else call_kwargs[1].get("url", call_kwargs[0][0])
    # positional first arg is the URL
    assert url_called == "https://api.tele.io/readings/bulk"
    headers_sent = call_kwargs[1].get("headers", {})
    assert headers_sent.get("Authorization") == "Bearer secret-key-xyz"


@pytest.mark.asyncio
async def test_fetch_readings_skips_malformed_entries_logs_error():
    """Entries missing required fields are skipped; valid entries are still returned."""
    fake_settings = _make_settings()

    sample_response = {
        "readings": [
            # valid entry
            {
                "vehicle_id": "VH-GOOD",
                "odometer_km": 10000,
                "reading_timestamp": "2024-06-01T12:00:00+00:00",
            },
            # missing 'odometer_km' — should be skipped
            {
                "vehicle_id": "VH-BAD",
                "reading_timestamp": "2024-06-01T12:00:00+00:00",
            },
        ]
    }

    mock_response = _build_response(sample_response)
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.config.settings", fake_settings):
        from importlib import reload
        import app.modules.telematics.providers.live_provider as lp_module
        reload(lp_module)
        provider = lp_module.LiveOdometerProvider()

        with patch("httpx.AsyncClient", return_value=mock_client):
            readings = await provider.fetch_readings(["VH-GOOD", "VH-BAD"])

    assert len(readings) == 1
    assert readings[0].vehicle_id == "VH-GOOD"


@pytest.mark.asyncio
async def test_fetch_readings_raises_on_http_error():
    """An HTTP error from the telematics endpoint propagates as HTTPStatusError."""
    fake_settings = _make_settings()

    mock_response = _build_response({}, status_code=503)
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.config.settings", fake_settings):
        from importlib import reload
        import app.modules.telematics.providers.live_provider as lp_module
        reload(lp_module)
        provider = lp_module.LiveOdometerProvider()

        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await provider.fetch_readings(["VH-001"])


@pytest.mark.asyncio
async def test_fetch_readings_raw_payload_preserved():
    """Each OdometerReading.raw_payload should be the original dict from the API."""
    fake_settings = _make_settings()

    entry = {
        "vehicle_id": "VH-XYZ",
        "odometer_km": 99999,
        "reading_timestamp": "2024-09-15T14:30:00Z",
        "extra_field": "some_extra_data",
    }
    sample_response = {"readings": [entry]}

    mock_response = _build_response(sample_response)
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.config.settings", fake_settings):
        from importlib import reload
        import app.modules.telematics.providers.live_provider as lp_module
        reload(lp_module)
        provider = lp_module.LiveOdometerProvider()

        with patch("httpx.AsyncClient", return_value=mock_client):
            readings = await provider.fetch_readings(["VH-XYZ"])

    assert len(readings) == 1
    assert readings[0].raw_payload == entry
    assert readings[0].raw_payload["extra_field"] == "some_extra_data"
