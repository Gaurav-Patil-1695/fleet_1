"""Unit tests for app.modules.readings.service.ReadingService."""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest

from app.modules.readings.schemas import ReadingCreate, ReadingListResponse, ReadingRead
from app.modules.readings.service import ReadingService


# ---------------------------------------------------------------------------
# Helpers / factories
# ---------------------------------------------------------------------------

VEHICLE_ID = UUID("d4e5f6a7-b8c9-0123-def4-567890abcdef")
READING_ID = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
USER_ID = UUID("f1e2d3c4-b5a6-7890-fedc-ba0987654321")


def _make_reading(
    id: UUID = READING_ID,
    vehicle_id: UUID = VEHICLE_ID,
    recorded_by_user_id: UUID | None = USER_ID,
    odometer_km: float = 45230.5,
    source: str = "manual",
    is_test_mode: bool = False,
    raw_payload: Any = None,
    reading_timestamp: datetime = datetime(2024, 6, 15, 8, 30, 0, tzinfo=timezone.utc),
    created_at: datetime = datetime(2024, 6, 15, 8, 31, 2, tzinfo=timezone.utc),
) -> MagicMock:
    r = MagicMock()
    r.id = id
    r.vehicle_id = vehicle_id
    r.recorded_by_user_id = recorded_by_user_id
    r.odometer_km = odometer_km
    r.source = source
    r.is_test_mode = is_test_mode
    r.raw_payload = raw_payload
    r.reading_timestamp = reading_timestamp
    r.created_at = created_at
    # Make model_validate work by letting it behave as a dict-like ORM model
    r.__class__ = type(
        "Reading",
        (),
        {
            "__annotations__": {},
            "model_config": {"from_attributes": True},
        },
    )
    return r


def _make_vehicle(
    id: UUID = VEHICLE_ID,
    last_odometer_recorded_at: datetime | None = None,
    last_known_odometer_km: float | None = None,
    last_serviced_at: datetime | None = None,
    last_serviced_odometer_km: float | None = None,
) -> MagicMock:
    v = MagicMock()
    v.id = id
    v.last_odometer_recorded_at = last_odometer_recorded_at
    v.last_known_odometer_km = last_known_odometer_km
    v.last_serviced_at = last_serviced_at
    v.last_serviced_odometer_km = last_serviced_odometer_km
    return v


def _make_user(id: UUID = USER_ID, role: str = "manager") -> MagicMock:
    u = MagicMock()
    u.id = id
    u.role = role
    return u


def _make_service(reading_repo: MagicMock, vehicle_repo: MagicMock) -> ReadingService:
    """Construct a ReadingService with injected mock repos."""
    db = MagicMock()  # AsyncSession – not called directly in service logic
    svc = ReadingService(db)
    svc._reading_repo = reading_repo
    svc._vehicle_repo = vehicle_repo
    return svc


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_readings_returns_paginated_response():
    """list_readings returns a ReadingListResponse with correct pagination metadata."""
    readings = [
        _make_reading(
            id=UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
            odometer_km=45230.5,
            source="manual",
            reading_timestamp=datetime(2024, 6, 15, 8, 30, 0, tzinfo=timezone.utc),
            created_at=datetime(2024, 6, 15, 8, 31, 2, tzinfo=timezone.utc),
        ),
        _make_reading(
            id=UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901"),
            recorded_by_user_id=None,
            odometer_km=45540.0,
            source="telematics",
            raw_payload={"device_id": "TLM-00342", "signal_strength": -72},
            reading_timestamp=datetime(2024, 6, 16, 14, 0, 0, tzinfo=timezone.utc),
            created_at=datetime(2024, 6, 16, 14, 0, 5, tzinfo=timezone.utc),
        ),
    ]

    reading_repo = MagicMock()
    reading_repo.list_readings = AsyncMock(return_value=(readings, 2))
    vehicle_repo = MagicMock()

    svc = _make_service(reading_repo, vehicle_repo)

    # Patch ReadingRead.model_validate so it returns a proper schema object
    with patch.object(
        ReadingRead,
        "model_validate",
        side_effect=lambda r: ReadingRead(
            id=r.id,
            vehicle_id=r.vehicle_id,
            recorded_by_user_id=r.recorded_by_user_id,
            odometer_km=r.odometer_km,
            source=r.source,
            is_test_mode=r.is_test_mode,
            raw_payload=r.raw_payload,
            reading_timestamp=r.reading_timestamp,
            created_at=r.created_at,
        ),
    ):
        result = await svc.list_readings(page=1, page_size=20)

    assert isinstance(result, ReadingListResponse)
    assert result.pagination.total_items == 2
    assert result.pagination.total_pages == 1
    assert result.pagination.page == 1
    assert result.pagination.page_size == 20
    assert len(result.data) == 2


@pytest.mark.asyncio
async def test_create_reading_manual_sets_recorded_by_user_id():
    """Manual readings store the current user's id as recorded_by_user_id."""
    user = _make_user(role="manager")
    stored_reading = _make_reading(
        id=UUID("c3d4e5f6-a7b8-9012-cdef-123456789012"),
        vehicle_id=VEHICLE_ID,
        recorded_by_user_id=USER_ID,
        odometer_km=45890.3,
        source="manual",
        is_test_mode=False,
        reading_timestamp=datetime(2024, 6, 17, 9, 15, 0, tzinfo=timezone.utc),
        created_at=datetime(2024, 6, 17, 9, 16, 44, tzinfo=timezone.utc),
    )

    vehicle_repo = MagicMock()
    vehicle_repo.get_by_id = AsyncMock(return_value=_make_vehicle())
    vehicle_repo.update = AsyncMock(return_value=None)

    reading_repo = MagicMock()
    reading_repo.create = AsyncMock(return_value=stored_reading)

    svc = _make_service(reading_repo, vehicle_repo)

    body = ReadingCreate(
        vehicle_id=VEHICLE_ID,
        odometer_km=45890.3,
        source="manual",
        is_test_mode=False,
        raw_payload=None,
        reading_timestamp=datetime(2024, 6, 17, 9, 15, 0, tzinfo=timezone.utc),
    )

    with patch("app.modules.readings.service.calculate_next_service_due", return_value=(None, None)), \
         patch.object(
             ReadingRead,
             "model_validate",
             side_effect=lambda r: ReadingRead(
                 id=r.id,
                 vehicle_id=r.vehicle_id,
                 recorded_by_user_id=r.recorded_by_user_id,
                 odometer_km=r.odometer_km,
                 source=r.source,
                 is_test_mode=r.is_test_mode,
                 raw_payload=r.raw_payload,
                 reading_timestamp=r.reading_timestamp,
                 created_at=r.created_at,
             ),
         ):
        result = await svc.create_reading(body=body, current_user=user)

    # Verify repo was called with the current user id
    reading_repo.create.assert_called_once()
    call_kwargs = reading_repo.create.call_args.kwargs
    assert call_kwargs["recorded_by_user_id"] == user.id
    assert call_kwargs["source"] == "manual"
    assert result.source == "manual"
    assert result.odometer_km == 45890.3


@pytest.mark.asyncio
async def test_create_reading_telematics_does_not_set_recorded_by_user_id():
    """Telematics readings do NOT set recorded_by_user_id."""
    user = _make_user(role="administrator")
    stored_reading = _make_reading(
        recorded_by_user_id=None,
        odometer_km=45540.0,
        source="telematics",
        is_test_mode=False,
        raw_payload={"device_id": "TLM-00342", "signal_strength": -72},
        reading_timestamp=datetime(2024, 6, 16, 14, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2024, 6, 16, 14, 0, 5, tzinfo=timezone.utc),
    )

    vehicle_repo = MagicMock()
    vehicle_repo.get_by_id = AsyncMock(return_value=_make_vehicle())
    vehicle_repo.update = AsyncMock(return_value=None)

    reading_repo = MagicMock()
    reading_repo.create = AsyncMock(return_value=stored_reading)

    svc = _make_service(reading_repo, vehicle_repo)

    body = ReadingCreate(
        vehicle_id=VEHICLE_ID,
        odometer_km=45540.0,
        source="telematics",
        is_test_mode=False,
        raw_payload={"device_id": "TLM-00342", "signal_strength": -72},
        reading_timestamp=datetime(2024, 6, 16, 14, 0, 0, tzinfo=timezone.utc),
    )

    with patch("app.modules.readings.service.calculate_next_service_due", return_value=(None, None)), \
         patch.object(
             ReadingRead,
             "model_validate",
             side_effect=lambda r: ReadingRead(
                 id=r.id,
                 vehicle_id=r.vehicle_id,
                 recorded_by_user_id=r.recorded_by_user_id,
                 odometer_km=r.odometer_km,
                 source=r.source,
                 is_test_mode=r.is_test_mode,
                 raw_payload=r.raw_payload,
                 reading_timestamp=r.reading_timestamp,
                 created_at=r.created_at,
             ),
         ):
        result = await svc.create_reading(body=body, current_user=user)

    call_kwargs = reading_repo.create.call_args.kwargs
    assert call_kwargs["recorded_by_user_id"] is None
    assert call_kwargs["source"] == "telematics"


@pytest.mark.asyncio
async def test_create_reading_telematics_test_mode_stores_telematics_mock_source():
    """When source=telematics and is_test_mode=True, the stored source is telematics_mock."""
    user = _make_user(role="administrator")
    stored_reading = _make_reading(
        recorded_by_user_id=None,
        odometer_km=12345.0,
        source="telematics_mock",
        is_test_mode=True,
        reading_timestamp=datetime(2024, 6, 16, 14, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2024, 6, 16, 14, 0, 5, tzinfo=timezone.utc),
    )

    vehicle_repo = MagicMock()
    vehicle_repo.get_by_id = AsyncMock(return_value=_make_vehicle())
    vehicle_repo.update = AsyncMock(return_value=None)

    reading_repo = MagicMock()
    reading_repo.create = AsyncMock(return_value=stored_reading)

    svc = _make_service(reading_repo, vehicle_repo)

    body = ReadingCreate(
        vehicle_id=VEHICLE_ID,
        odometer_km=12345.0,
        source="telematics",
        is_test_mode=True,
        reading_timestamp=datetime(2024, 6, 16, 14, 0, 0, tzinfo=timezone.utc),
    )

    with patch("app.modules.readings.service.calculate_next_service_due", return_value=(None, None)), \
         patch.object(
             ReadingRead,
             "model_validate",
             side_effect=lambda r: ReadingRead(
                 id=r.id,
                 vehicle_id=r.vehicle_id,
                 recorded_by_user_id=r.recorded_by_user_id,
                 odometer_km=r.odometer_km,
                 source=r.source,
                 is_test_mode=r.is_test_mode,
                 raw_payload=r.raw_payload,
                 reading_timestamp=r.reading_timestamp,
                 created_at=r.created_at,
             ),
         ):
        result = await svc.create_reading(body=body, current_user=user)

    call_kwargs = reading_repo.create.call_args.kwargs
    assert call_kwargs["source"] == "telematics_mock"
    assert call_kwargs["is_test_mode"] is True


@pytest.mark.asyncio
async def test_create_reading_raises_404_when_vehicle_not_found():
    """create_reading raises HTTP 404 if the vehicle does not exist."""
    from fastapi import HTTPException

    user = _make_user()
    vehicle_repo = MagicMock()
    vehicle_repo.get_by_id = AsyncMock(return_value=None)
    reading_repo = MagicMock()

    svc = _make_service(reading_repo, vehicle_repo)

    body = ReadingCreate(
        vehicle_id=VEHICLE_ID,
        odometer_km=1000.0,
        source="manual",
        reading_timestamp=datetime(2024, 6, 17, 9, 15, 0, tzinfo=timezone.utc),
    )

    with pytest.raises(HTTPException) as exc_info:
        await svc.create_reading(body=body, current_user=user)

    assert exc_info.value.status_code == 404
    detail = exc_info.value.detail
    assert detail["code"] == "VEHICLE_NOT_FOUND"
    assert detail["message"] == "Vehicle not found."


@pytest.mark.asyncio
async def test_get_reading_returns_reading_read_schema():
    """get_reading returns a ReadingRead for an existing reading."""
    raw = _make_reading()

    reading_repo = MagicMock()
    reading_repo.get_by_id = AsyncMock(return_value=raw)
    vehicle_repo = MagicMock()

    svc = _make_service(reading_repo, vehicle_repo)

    with patch.object(
        ReadingRead,
        "model_validate",
        side_effect=lambda r: ReadingRead(
            id=r.id,
            vehicle_id=r.vehicle_id,
            recorded_by_user_id=r.recorded_by_user_id,
            odometer_km=r.odometer_km,
            source=r.source,
            is_test_mode=r.is_test_mode,
            raw_payload=r.raw_payload,
            reading_timestamp=r.reading_timestamp,
            created_at=r.created_at,
        ),
    ):
        result = await svc.get_reading(reading_id=READING_ID)

    assert isinstance(result, ReadingRead)
    assert result.id == READING_ID
    assert result.vehicle_id == VEHICLE_ID
    assert result.odometer_km == 45230.5
    assert result.source == "manual"


@pytest.mark.asyncio
async def test_get_reading_raises_404_when_not_found():
    """get_reading raises HTTP 404 when the reading does not exist."""
    from fastapi import HTTPException

    reading_repo = MagicMock()
    reading_repo.get_by_id = AsyncMock(return_value=None)
    vehicle_repo = MagicMock()

    svc = _make_service(reading_repo, vehicle_repo)

    with pytest.raises(HTTPException) as exc_info:
        await svc.get_reading(reading_id=READING_ID)

    assert exc_info.value.status_code == 404
    detail = exc_info.value.detail
    assert detail["code"] == "READING_NOT_FOUND"
    assert detail["message"] == "Reading not found."


@pytest.mark.asyncio
async def test_list_readings_invalid_from_date_raises_400():
    """list_readings raises HTTP 400 when 'from' is not a valid datetime string."""
    from fastapi import HTTPException

    reading_repo = MagicMock()
    vehicle_repo = MagicMock()

    svc = _make_service(reading_repo, vehicle_repo)

    with pytest.raises(HTTPException) as exc_info:
        await svc.list_readings(from_="not-a-date")

    assert exc_info.value.status_code == 400
    detail = exc_info.value.detail
    assert detail["code"] == "INVALID_DATE"
    assert "'from'" in detail["message"]
