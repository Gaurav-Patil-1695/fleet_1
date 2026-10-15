"""Unit tests for app.modules.schedules.service.ScheduleService.

All database I/O is replaced with an AsyncMock session so no real
PostgreSQL instance is required.
"""
import math
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.modules.schedules.schemas import ScheduleCreate, ScheduleUpdate
from app.modules.schedules.service import ScheduleService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SCHEDULE_ID = UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
VEHICLE_TYPE_ID = UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")
NOW = datetime(2024, 4, 20, 10, 0, 0, tzinfo=timezone.utc)


def _make_schedule_model(
    schedule_id: UUID = SCHEDULE_ID,
    vehicle_type_id: UUID = VEHICLE_TYPE_ID,
    vehicle_class: str = "heavy_truck",
    km_interval: int = 10000,
    month_interval: int = 6,
    is_active: bool = True,
) -> MagicMock:
    m = MagicMock()
    m.id = schedule_id
    m.vehicle_type_id = vehicle_type_id
    m.vehicle_class = vehicle_class
    m.km_interval = km_interval
    m.month_interval = month_interval
    m.is_active = is_active
    m.created_at = NOW
    m.updated_at = NOW
    return m


def _make_db(
    scalar_one_or_none=None,
    scalar_one=0,
    scalars_all=None,
) -> AsyncMock:
    """Build a minimal AsyncSession mock."""
    db = AsyncMock()

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = scalar_one_or_none
    execute_result.scalar_one.return_value = scalar_one
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_all or []
    execute_result.scalars.return_value = scalars_mock

    db.execute = AsyncMock(return_value=execute_result)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.commit = AsyncMock()
    db.delete = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_schedules_returns_paginated_response():
    """list_schedules builds a ScheduleListResponse with correct pagination."""
    row = _make_schedule_model()
    db = AsyncMock()

    # First execute → count, second execute → rows
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1

    rows_result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [row]
    rows_result.scalars.return_value = scalars_mock

    db.execute = AsyncMock(side_effect=[count_result, rows_result])

    service = ScheduleService(db)
    response = await service.list_schedules(
        page=1, limit=20,
        vehicle_type_id=None, vehicle_class=None, is_active=None,
    )

    assert response.pagination.page == 1
    assert response.pagination.page_size == 20
    assert response.pagination.total_items == 1
    assert response.pagination.total_pages == 1
    assert len(response.data) == 1
    assert response.data[0].id == SCHEDULE_ID


@pytest.mark.asyncio
async def test_list_schedules_invalid_vehicle_type_uuid_raises_400():
    """list_schedules raises HTTP 400 when vehicle_type_id is not a valid UUID."""
    db = AsyncMock()
    service = ScheduleService(db)
    with pytest.raises(HTTPException) as exc_info:
        await service.list_schedules(
            page=1, limit=20,
            vehicle_type_id="not-a-uuid",
            vehicle_class=None,
            is_active=None,
        )
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "INVALID_UUID"


@pytest.mark.asyncio
async def test_create_schedule_happy_path():
    """create_schedule persists a new schedule and returns a Schedule schema."""
    new_row = _make_schedule_model()

    db = AsyncMock()
    # first execute → no existing active schedule (conflict check)
    conflict_result = MagicMock()
    conflict_result.scalar_one_or_none.return_value = None
    # second execute → no vehicles to recalculate
    vehicles_result = MagicMock()
    vehicles_scalars = MagicMock()
    vehicles_scalars.all.return_value = []
    vehicles_result.scalars.return_value = vehicles_scalars

    db.execute = AsyncMock(side_effect=[conflict_result, vehicles_result])
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()

    # Use db.refresh side-effect to populate DB-generated fields on the model instance
    async def _refresh_side_effect(obj):
        obj.id = new_row.id
        obj.created_at = new_row.created_at
        obj.updated_at = new_row.updated_at

    db.refresh = AsyncMock(side_effect=_refresh_side_effect)

    body = ScheduleCreate(
        vehicle_type_id=VEHICLE_TYPE_ID,
        vehicle_class="heavy_truck",
        km_interval=10000,
        month_interval=6,
        is_active=True,
    )

    service = ScheduleService(db)
    result = await service.create_schedule(body)

    assert result.vehicle_type_id == VEHICLE_TYPE_ID
    assert result.km_interval == 10000
    assert result.month_interval == 6
    assert result.is_active is True
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_schedule_conflict_raises_409():
    """create_schedule raises 409 when an active schedule already exists."""
    existing = _make_schedule_model()

    db = AsyncMock()
    conflict_result = MagicMock()
    conflict_result.scalar_one_or_none.return_value = existing
    db.execute = AsyncMock(return_value=conflict_result)

    body = ScheduleCreate(
        vehicle_type_id=VEHICLE_TYPE_ID,
        vehicle_class="heavy_truck",
        km_interval=10000,
        month_interval=6,
        is_active=True,
    )

    service = ScheduleService(db)
    with pytest.raises(HTTPException) as exc_info:
        await service.create_schedule(body)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "CONFLICT"
    assert "active schedule" in exc_info.value.detail["message"]


@pytest.mark.asyncio
async def test_get_schedule_returns_none_when_not_found():
    """get_schedule returns None for an unknown schedule_id."""
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result_mock)

    service = ScheduleService(db)
    result = await service.get_schedule(uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_get_schedule_returns_schema_when_found():
    """get_schedule returns a Schedule schema for an existing record."""
    row = _make_schedule_model()
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = row
    db.execute = AsyncMock(return_value=result_mock)

    service = ScheduleService(db)
    result = await service.get_schedule(SCHEDULE_ID)

    assert result is not None
    assert result.id == SCHEDULE_ID
    assert result.km_interval == 10000
    assert result.month_interval == 6


@pytest.mark.asyncio
async def test_update_schedule_happy_path():
    """update_schedule applies changes and returns the updated Schedule."""
    row = _make_schedule_model(km_interval=10000, month_interval=6)

    db = AsyncMock()
    # first execute → find the schedule row
    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = row
    # second execute → vehicles for recalculation
    vehicles_result = MagicMock()
    vehicles_scalars = MagicMock()
    vehicles_scalars.all.return_value = []
    vehicles_result.scalars.return_value = vehicles_scalars

    db.execute = AsyncMock(side_effect=[find_result, vehicles_result])
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.commit = AsyncMock()

    body = ScheduleUpdate(km_interval=15000, month_interval=9)

    service = ScheduleService(db)
    result = await service.update_schedule(SCHEDULE_ID, body)

    assert result is not None
    assert row.km_interval == 15000
    assert row.month_interval == 9
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_schedule_not_found_returns_false():
    """delete_schedule returns False when the schedule does not exist."""
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result_mock)

    service = ScheduleService(db)
    deleted = await service.delete_schedule(uuid4())
    assert deleted is False
