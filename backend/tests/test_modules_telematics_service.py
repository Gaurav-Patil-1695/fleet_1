"""Unit tests for TelematicsService (app.modules.telematics.service)."""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from app.modules.telematics.service import TelematicsService
from app.modules.telematics.schemas import (
    TelematicsIngestRequest,
    TelematicsReadingPayload,
    TelematicsIngestResponse,
)

# ── shared test data ──────────────────────────────────────────────────────────

VEHICLE_ID_1 = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
VEHICLE_ID_2 = UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")

TS_1 = datetime(2024, 7, 15, 10, 30, 0, tzinfo=timezone.utc)
TS_2 = datetime(2024, 7, 15, 10, 31, 0, tzinfo=timezone.utc)


def make_payload(vehicle_id=VEHICLE_ID_1, odometer_km=48750.5, ts=TS_1, raw_payload=None):
    return TelematicsReadingPayload(
        vehicle_id=vehicle_id,
        odometer_km=odometer_km,
        reading_timestamp=ts,
        raw_payload=raw_payload or {"source_device": "TLM-001", "signal_strength": -72},
    )


def make_vehicle(vehicle_id=VEHICLE_ID_1):
    v = MagicMock()
    v.id = vehicle_id
    v.vehicle_type_id = None
    return v


def make_user():
    u = MagicMock()
    u.id = UUID("00000000-0000-0000-0000-000000000001")
    return u


def make_reading(reading_id=None, vehicle_id=VEHICLE_ID_1, odometer_km=48750.5, source="telematics_mock"):
    r = MagicMock()
    r.id = reading_id or UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    r.vehicle_id = vehicle_id
    r.odometer_km = odometer_km
    r.source = source
    return r


# ── helpers to build a service with mocked internals ─────────────────────────

def _build_service(db=None):
    db = db or AsyncMock()
    svc = TelematicsService(db)
    return svc


# ── tests ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_ingest_two_readings_both_accepted_mock_provider():
    """Happy-path: two valid readings are both accepted; source is telematics_mock."""
    svc = _build_service()

    svc._vehicle_repo.get_by_id = AsyncMock(side_effect=[
        make_vehicle(VEHICLE_ID_1),
        make_vehicle(VEHICLE_ID_2),
    ])
    svc._reading_repo.create = AsyncMock(side_effect=[
        make_reading(vehicle_id=VEHICLE_ID_1),
        make_reading(vehicle_id=VEHICLE_ID_2),
    ])
    svc._vehicle_repo.update = AsyncMock(return_value=None)

    request = TelematicsIngestRequest(
        readings=[
            make_payload(VEHICLE_ID_1, 48750.5, TS_1, {"source_device": "TLM-001", "signal_strength": -72}),
            make_payload(VEHICLE_ID_2, 75350.0, TS_2, {"source_device": "TLM-002", "signal_strength": -68}),
        ]
    )

    mock_provider = MagicMock()
    mock_provider.__class__.__name__ = "MockOdometerProvider"

    with patch("app.modules.telematics.service.get_provider", return_value=mock_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=None):
        result = await svc.ingest_readings(request, make_user())

    assert result.accepted == 2
    assert result.rejected == 0
    assert result.errors == []


@pytest.mark.asyncio
async def test_ingest_source_is_telematics_mock_when_mock_provider():
    """When MockOdometerProvider is active, source stored is 'telematics_mock'."""
    svc = _build_service()

    captured_data = {}

    async def fake_create(data):
        captured_data.update(data)
        return make_reading(source=data["source"])

    svc._vehicle_repo.get_by_id = AsyncMock(return_value=make_vehicle())
    svc._reading_repo.create = AsyncMock(side_effect=fake_create)
    svc._vehicle_repo.update = AsyncMock(return_value=None)

    request = TelematicsIngestRequest(readings=[make_payload()])

    mock_provider = MagicMock()
    mock_provider.__class__.__name__ = "MockOdometerProvider"

    with patch("app.modules.telematics.service.get_provider", return_value=mock_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=None):
        await svc.ingest_readings(request, make_user())

    assert captured_data["source"] == "telematics_mock"
    assert captured_data["is_test_mode"] is True


@pytest.mark.asyncio
async def test_ingest_source_is_telematics_when_live_provider():
    """When a non-mock provider is active, source stored is 'telematics'."""
    svc = _build_service()

    captured_data = {}

    async def fake_create(data):
        captured_data.update(data)
        return make_reading(source=data["source"])

    svc._vehicle_repo.get_by_id = AsyncMock(return_value=make_vehicle())
    svc._reading_repo.create = AsyncMock(side_effect=fake_create)
    svc._vehicle_repo.update = AsyncMock(return_value=None)

    request = TelematicsIngestRequest(readings=[make_payload()])

    live_provider = MagicMock()
    live_provider.__class__.__name__ = "LiveOdometerProvider"

    with patch("app.modules.telematics.service.get_provider", return_value=live_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=None):
        await svc.ingest_readings(request, make_user())

    assert captured_data["source"] == "telematics"
    assert captured_data["is_test_mode"] is False


@pytest.mark.asyncio
async def test_ingest_vehicle_not_found_increments_rejected():
    """When vehicle_repo.get_by_id returns None the reading is rejected."""
    svc = _build_service()

    svc._vehicle_repo.get_by_id = AsyncMock(return_value=None)
    svc._reading_repo.create = AsyncMock()
    svc._vehicle_repo.update = AsyncMock()

    request = TelematicsIngestRequest(readings=[make_payload()])

    mock_provider = MagicMock()
    mock_provider.__class__.__name__ = "MockOdometerProvider"

    with patch("app.modules.telematics.service.get_provider", return_value=mock_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=None):
        result = await svc.ingest_readings(request, make_user())

    assert result.accepted == 0
    assert result.rejected == 1
    assert len(result.errors) == 1
    assert result.errors[0].vehicle_id == VEHICLE_ID_1
    assert str(VEHICLE_ID_1) in result.errors[0].reason


@pytest.mark.asyncio
async def test_ingest_partial_failure_one_accepted_one_rejected():
    """One valid vehicle, one missing: accepted=1 rejected=1."""
    svc = _build_service()

    svc._vehicle_repo.get_by_id = AsyncMock(side_effect=[
        make_vehicle(VEHICLE_ID_1),  # first succeeds
        None,                         # second not found
    ])
    svc._reading_repo.create = AsyncMock(return_value=make_reading())
    svc._vehicle_repo.update = AsyncMock(return_value=None)

    request = TelematicsIngestRequest(
        readings=[
            make_payload(VEHICLE_ID_1, 48750.5, TS_1),
            make_payload(VEHICLE_ID_2, 75350.0, TS_2),
        ]
    )

    mock_provider = MagicMock()
    mock_provider.__class__.__name__ = "MockOdometerProvider"

    with patch("app.modules.telematics.service.get_provider", return_value=mock_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=None):
        result = await svc.ingest_readings(request, make_user())

    assert result.accepted == 1
    assert result.rejected == 1


@pytest.mark.asyncio
async def test_ingest_vehicle_update_called_with_odometer_fields():
    """After a successful reading, vehicle_repo.update receives last_known_odometer_km."""
    svc = _build_service()

    svc._vehicle_repo.get_by_id = AsyncMock(return_value=make_vehicle())
    svc._reading_repo.create = AsyncMock(return_value=make_reading())
    update_calls = []

    async def fake_update(vid, fields):
        update_calls.append((vid, fields))

    svc._vehicle_repo.update = AsyncMock(side_effect=fake_update)

    request = TelematicsIngestRequest(readings=[make_payload(VEHICLE_ID_1, 48750.5, TS_1)])

    mock_provider = MagicMock()
    mock_provider.__class__.__name__ = "MockOdometerProvider"

    with patch("app.modules.telematics.service.get_provider", return_value=mock_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=None):
        await svc.ingest_readings(request, make_user())

    assert len(update_calls) == 1
    vid, fields = update_calls[0]
    assert vid == VEHICLE_ID_1
    assert fields["last_known_odometer_km"] == 48750.5
    assert fields["last_odometer_recorded_at"] == TS_1


@pytest.mark.asyncio
async def test_ingest_next_service_populated_when_scheduling_returns_value():
    """When calculate_next_service_due returns a (date, odometer) tuple the update includes them."""
    from datetime import date

    svc = _build_service()

    svc._vehicle_repo.get_by_id = AsyncMock(return_value=make_vehicle())
    svc._reading_repo.create = AsyncMock(return_value=make_reading())
    update_calls = []

    async def fake_update(vid, fields):
        update_calls.append(fields)

    svc._vehicle_repo.update = AsyncMock(side_effect=fake_update)

    request = TelematicsIngestRequest(readings=[make_payload()])

    mock_provider = MagicMock()
    mock_provider.__class__.__name__ = "MockOdometerProvider"

    due_date = date(2025, 1, 15)
    due_odometer = 60000.0

    with patch("app.modules.telematics.service.get_provider", return_value=mock_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=(due_date, due_odometer)):
        result = await svc.ingest_readings(request, make_user())

    assert result.accepted == 1
    assert update_calls[0]["next_service_due_date"] == due_date
    assert update_calls[0]["next_service_due_odometer_km"] == due_odometer


@pytest.mark.asyncio
async def test_ingest_reading_repo_exception_counted_as_rejected():
    """If reading_repo.create raises, the reading is rejected and error recorded."""
    svc = _build_service()

    svc._vehicle_repo.get_by_id = AsyncMock(return_value=make_vehicle())
    svc._reading_repo.create = AsyncMock(side_effect=RuntimeError("DB constraint violation"))
    svc._vehicle_repo.update = AsyncMock()

    request = TelematicsIngestRequest(readings=[make_payload()])

    mock_provider = MagicMock()
    mock_provider.__class__.__name__ = "MockOdometerProvider"

    with patch("app.modules.telematics.service.get_provider", return_value=mock_provider), \
         patch("app.modules.telematics.service.calculate_next_service_due", return_value=None):
        result = await svc.ingest_readings(request, make_user())

    assert result.accepted == 0
    assert result.rejected == 1
    assert "DB constraint violation" in result.errors[0].reason
